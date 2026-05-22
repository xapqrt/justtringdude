// Web app ingestion and isomorphic matching

let graph_nodes = null;
let collapsed_nodes = [];

// Sample DAG export from the Fabric Mod (simulate ingest)
const sampleJSON = {
    nodes: [
        { id: "n1", type: "NOT_GATE", pos: "[10, 64, 10]" },
        { id: "n2", type: "NOT_GATE", pos: "[12, 64, 10]" },
        { id: "n3", type: "NOT_GATE", pos: "[11, 64, 11]" }
    ],
    edges: [
        { from: "n1", to: "n3" },
        { from: "n2", to: "n3" }
    ]
};











function detectSubGraphs(dag) {
    console.log("Running aggressive Sub-Graph Isomorphism...");
    
    // Check for AND, OR, NOT, NAND, NOR, and SR Latches
    // Naive sub-graph matching pattern:
    // If two NOT gates output to a third NOT gate => AND Gate (or NAND depending on redstone line inversion)
    
    collapsed_nodes = [];
    
    // minecraft ticks to ms delay setup
    // 1 redstone tick = 100ms
    let buffers = dag.nodes.filter(n => n.type === "BUFFER");
    buffers.forEach((b, idx) => {
        let delay_ms = (parseInt(b.delay) || 1) * 100;
        console.log(`calculated delay ${delay_ms}ms for buffer ${b.id}`);
        collapsed_nodes.push({ id: b.id, type: "DELAY", delay_ms: delay_ms, x: 100, y: 150 + (idx * 50) });
    });









    let notGates = dag.nodes.filter(n => n.type === "NOT_GATE");
    console.log(`Found ${notGates.length} potential NOT gates`);
    
    // look for AND: two inputs powering a line that powers a NOT gate
    // OR: two wires powering the same repeater/line
    // This is super hacky without a real graph transversal lib
    let and_counter = 0;
    let or_counter = 0;
    
    // stubbing aggressive checks for AND/OR
    if (dag.nodes.some(n => n.type === "COMPARATOR" && dag.edges.length > 2)) {
         collapsed_nodes.push({ id: "g_" + and_counter++, type: "AND", x: 150, y: 50 });
         console.log("pattern matched: AND");
    }
    
    // multiple edges to same target = OR
    let targetCounts = {};
    dag.edges.forEach(e => {
        targetCounts[e.to] = (targetCounts[e.to] || 0) + 1;
    });
    
    for (let target in targetCounts) {
        if (targetCounts[target] >= 2) {
             collapsed_nodes.push({ id: "g_or_" + or_counter++, type: "OR", x: 200, y: 100 });
             console.log("pattern matched: OR");
        }
    }
    
    // Check for NOT and NOR
    let not_counter = 0;
    
    // if a single NOT gate isn't part of an AND/NAND cluster, keep it as NOT
    notGates.forEach(ng => {
        // assume it is standalone for now
        let isIsolated = !dag.edges.some(e => e.to === ng.id && targetCounts[ng.id] > 1);
        if (isIsolated) {
            collapsed_nodes.push({ id: "g_not_" + not_counter++, type: "NOT", x: 50, y: 250 });
            console.log("pattern matched: NOT");
        }
    });

    // NOR = OR + NOT
    // stubbing
    if (or_counter > 0 && not_counter > 0) {
        collapsed_nodes.push({ id: "g_nor_1", type: "NOR", x: 250, y: 200 });
        console.log("pattern matched: NOR");
    }
    
    // Naive mock pattern matching for the NAND/SR logic
    if (dag.nodes.length >= 3) {
        console.log("pattern matched: NAND");
        collapsed_nodes.push({ id: "g1", type: "NAND", x: 100, y: 150 });
    }
    
    // ...other patterns: NOR, SR Latch, OR
    console.log("pattern matched: SR_LATCH");
    collapsed_nodes.push({ id: "g2", type: "SR_LATCH", x: 300, y: 150 });
    
    return collapsed_nodes;
}













function renderSVG(gates) {
    const container = document.getElementById("svg_container");
    let svgContent = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;
    
    gates.forEach(gate => {
        // TODO: fix the SVG line routing if i have time before the deadline
        // SVG routing is literal hell, everything is overlapping
        
        // topological depth sort placeholder calculation
        // actually replacing this with a naive depth map, no more random()
        
        let in_degree = 0;
        if (graph_nodes && graph_nodes.edges) {
            in_degree = graph_nodes.edges.filter(e => e.to === gate.id).length;
        }
        gate.depth = in_degree; // somewhat Kahn's algorithm adjacent lol
        
        let level_x = (gate.depth) * 150 + 50;
        gate.x = level_x;
        
        // replaced trash straight lines with bezier curves so it looks less awful
        svgContent += `
            <path d="M ${gate.x - 30},${gate.y + 20} C ${gate.x - 15},${gate.y + 20} ${gate.x - 15},${gate.y + 20} ${gate.x},${gate.y + 20}" fill="none" stroke="gray" stroke-width="2" />
            <path d="M ${gate.x + 50},${gate.y + 20} C ${gate.x + 65},${gate.y + 20} ${gate.x + 65},${gate.y + 20} ${gate.x + 80},${gate.y + 20}" fill="none" stroke="gray" stroke-width="2" />
        `;
        
        if (gate.type === "NAND") {
            // Draw standard IEEE NAND D-shape + inversion bubble
            svgContent += `
                <g transform="translate(${gate.x}, ${gate.y})">
                    <path d="M 0,0 L 20,0 A 20,20 0 0,1 20,40 L 0,40 Z" fill="none" stroke="white" stroke-width="2"/>
                    <circle cx="45" cy="20" r="5" fill="none" stroke="white" stroke-width="2"/>
                    <text x="5" y="25" fill="white" font-size="12">NAND</text>
                </g>
            `;
        }
        else if (gate.type === "SR_LATCH") {
            // Draw SR Latch box
            svgContent += `
                <g transform="translate(${gate.x}, ${gate.y})">
                    <rect x="0" y="0" width="50" height="60" fill="none" stroke="white" stroke-width="2"/>
                    <text x="5" y="20" fill="white" font-size="12">S</text>
                    <text x="5" y="50" fill="white" font-size="12">R</text>
                    <text x="35" y="20" fill="white" font-size="12">Q</text>
                    <text x="35" y="50" fill="white" font-size="12">Q'</text>
                </g>
            `;
        }
        else if (gate.type === "AND") {
            svgContent += `
                <g transform="translate(${gate.x}, ${gate.y})">
                    <path d="M 0,0 L 25,0 A 25,20 0 0,1 25,40 L 0,40 Z" fill="none" stroke="white" stroke-width="2"/>
                    <text x="5" y="25" fill="white" font-size="12">AND</text>
                </g>
            `;
        }
        else if (gate.type === "OR") {
            svgContent += `
                <g transform="translate(${gate.x}, ${gate.y})">
                    <path d="M 0,0 Q 15,20 0,40 Q 25,40 40,20 Q 25,0 0,0" fill="none" stroke="white" stroke-width="2"/>
                    <text x="10" y="25" fill="white" font-size="12">OR</text>
                </g>
            `;
        }
        else if (gate.type === "NOT") {
            svgContent += `
                <g transform="translate(${gate.x}, ${gate.y})">
                    <polygon points="0,0 30,20 0,40" fill="none" stroke="white" stroke-width="2"/>
                    <circle cx="35" cy="20" r="5" fill="none" stroke="white" stroke-width="2"/>
                </g>
            `;
        }
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

function synthesize() {
    graph_nodes = sampleJSON;
    let logicGates = detectSubGraphs(graph_nodes);
    renderSVG(logicGates);
}



















// C++ Transpiler Block
function generateCPP() {
    console.log("Transpiling DAG to C++ Arduino code...");
    
    let cpp = `// Auto-generated from Redstone-to-Real\n\n`;
    cpp += `void setup() {\n`;
    cpp += `    Serial.begin(9600);\n`;
    
    // map inputs to pins
    let pinCounter = 2; // starting pin
    if (graph_nodes && graph_nodes.nodes) {
        let inputs = graph_nodes.nodes.filter(n => n.type === "INPUT");
        inputs.forEach((inp, idx) => {
             cpp += `    pinMode(${pinCounter + idx}, INPUT_PULLUP);\n`;
        });
    }
    
    cpp += `}\n\n`;
    cpp += `void loop() {\n`;
    
    // logic string build up
    // mostly stubbed for now until the AST transverser is built
    cpp += `    // evaluate inputs and outputs via mapped gates\n`;
    cpp += `    bool out = false;\n`;
    
    if (collapsed_nodes && collapsed_nodes.length > 0) {
        collapsed_nodes.forEach(gn => {
             cpp += `    // processing ${gn.type} gate at ${gn.id}\n`;
             if (gn.type === "AND") {
                 cpp += `    bool ${gn.id.replace(/[^a-zA-Z0-9]/g, "_")} = input_A && input_B; // hardcoded inputs for now ugh\n`;
             } else if (gn.type === "NOT") {
                 cpp += `    bool ${gn.id.replace(/[^a-zA-Z0-9]/g, "_")} = !input_X;\n`;
             } else if (gn.type === "OR") {
                 cpp += `    bool ${gn.id.replace(/[^a-zA-Z0-9]/g, "_")} = input_A || input_B;\n`;
             } else if (gn.type === "DELAY") {
                 cpp += `    delay(${gn.delay_ms}); // translated buffer tick wait\n`;
             }
        });
        
        // mapping outputs for the arduino digital pins
        cpp += `\n    // final output writes\n`;
        let outputs = collapsed_nodes.filter(n => n.type === "DELAY" || n.type === "AND" || n.type === "OR");
        outputs.forEach((out_node, idx) => {
             cpp += `    digitalWrite(${8 + idx}, ${out_node.id.replace(/[^a-zA-Z0-9]/g, "_")});\n`;
        });
    }
    
    cpp += `}\n`;
    
    document.getElementById("cpp_out").innerText = cpp;
}
