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
    console.log("Running Sub-Graph Isomorphism...");
    
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
    
    let or_counter = 0;
    
    // multiple edges to same target = OR
    let targetCounts = {};
    dag.edges.forEach(e => {
        targetCounts[e.to] = (targetCounts[e.to] || 0) + 1;
    });
    
    for (let target in targetCounts) {
        if (targetCounts[target] >= 2) {
             let or_id = "g_or_" + or_counter++;
             collapsed_nodes.push({ id: or_id, type: "OR", x: 200, y: 100 });
             console.log("pattern matched: OR");
             
             // Reroute edges going to 'target' to go to 'or_id' instead
             dag.edges.forEach(e => {
                 if (e.to === target) {
                     e.to = or_id;
                 }
             });
             // Add an edge from 'or_id' to 'target'
             dag.edges.push({ from: or_id, to: target });
        }
    }
    
    // if a single NOT gate isn't part of an AND/NAND cluster, keep it as NOT
    notGates.forEach(ng => {
        // assume it is standalone for now
        // Keep the original id so edges map properly
        collapsed_nodes.push({ id: ng.id, type: "NOT", x: 50, y: 250 });
        console.log("pattern matched: NOT");
    });

    // XOR gate isomorphism
    let comparators_sub = dag.nodes.filter(n => n.type === "COMPARATOR" && n.mode === "subtract");
    comparators_sub.forEach((comp, idx) => {
        collapsed_nodes.push({ id: comp.id, type: "XOR", x: 180, y: 220 + (idx * 50) });
        console.log(`pattern matched XOR logic from comparator (subtract) at ${comp.id}`);
    });
    
    // Make sure we carry over inputs
    let inputs = dag.nodes.filter(n => n.type === "INPUT");
    inputs.forEach((inp, idx) => {
        collapsed_nodes.push({ id: inp.id, type: "INPUT", x: 20, y: 50 + (idx * 50) });
    });
    
    // Pass: OR + NOT = NOR
    let new_edges = [...dag.edges];
    collapsed_nodes = collapsed_nodes.filter(node => {
        if (node.type === "NOT") {
            let incoming = new_edges.filter(e => e.to === node.id);
            if (incoming.length === 1) {
                let source = collapsed_nodes.find(n => n.id === incoming[0].from);
                if (source && source.type === "OR") {
                    source.type = "NOR";
                    source.id = source.id.replace("g_or_", "g_nor_");
                    // update edges
                    new_edges.forEach(e => {
                        if (e.from === incoming[0].from) e.from = source.id;
                        if (e.to === incoming[0].from) e.to = source.id;
                    });
                    // remove the edge from OR to NOT, and route NOR to NOT's targets
                    new_edges = new_edges.filter(e => e.to !== node.id);
                    new_edges.forEach(e => { if (e.from === node.id) e.from = source.id; });
                    console.log("pattern matched: NOR");
                    return false; // remove NOT node
                }
            }
        }
        return true;
    });
    dag.edges = new_edges;

    // Pass: NOT + NOT -> OR = NAND -- or -- NOT + NOT -> NOR = AND
    collapsed_nodes.forEach(node => {
        if (node.type === "OR" || node.type === "NOR") {
            let incoming = dag.edges.filter(e => e.to === node.id);
            if (incoming.length >= 2) { // mostly handling 2-input for simplicity
                let s1 = collapsed_nodes.find(n => n.id === incoming[0].from);
                let s2 = collapsed_nodes.find(n => n.id === incoming[1].from);
                if (s1 && s2 && s1.type === "NOT" && s2.type === "NOT") {
                    node.type = node.type === "OR" ? "NAND" : "AND";
                    console.log(`pattern matched: ${node.type}`);
                    
                    let in1 = dag.edges.find(e => e.to === s1.id);
                    let in2 = dag.edges.find(e => e.to === s2.id);
                    if (in1 && in2) {
                        incoming[0].from = in1.from; // bypass NOT
                        incoming[1].from = in2.from; // bypass NOT
                    }
                }
            }
        }
    });

    // SR LATCH pass: Two cross-linked NORs or NOTs or NANDs
    let to_remove = new Set();
    collapsed_nodes.forEach(n1 => {
        collapsed_nodes.forEach(n2 => {
            if (n1.id !== n2.id && !to_remove.has(n1.id) && !to_remove.has(n2.id)) {
                let e1 = dag.edges.find(e => e.from === n1.id && e.to === n2.id);
                let e2 = dag.edges.find(e => e.from === n2.id && e.to === n1.id);
                if (e1 && e2) {
                    n1.type = "SR_LATCH";
                    console.log("pattern matched: SR_LATCH");
                    to_remove.add(n2.id);
                    // Redirect n2's outputs to n1
                    dag.edges.forEach(e => {
                        if (e.from === n2.id) e.from = n1.id;
                        if (e.to === n2.id) e.to = n1.id;
                    });
                }
            }
        });
    });
    collapsed_nodes = collapsed_nodes.filter(n => !to_remove.has(n.id));

    return collapsed_nodes;
}













function renderSVG(gates) {
    const container = document.getElementById("svg_container");
    let svgContent = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;
    
    // track heights per depth column so they don't stack on top of each other
    let depth_tracker = {};
    
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
        
        // Y-axis binning vertically
        if (!depth_tracker[gate.depth]) { depth_tracker[gate.depth] = 0; }
        gate.y = depth_tracker[gate.depth] * 80 + 50;
        depth_tracker[gate.depth]++;
    });

    // finally doing real edge routing instead of those trash hardcoded lines
    if (graph_nodes && graph_nodes.edges) {
        graph_nodes.edges.forEach(edge => {
            let fromGate = gates.find(g => g.id === edge.from);
            let toGate = gates.find(g => g.id === edge.to);
            
            if (fromGate && toGate) {
                // route from right side of source to left side of target
                let startX = fromGate.x + 50;
                let startY = fromGate.y + 20;
                let endX = toGate.x - 5;
                let endY = toGate.y + 20;
                
                // bezier cubic anchor calculation for curved wires
                let ctrlX1 = startX + 40;
                let ctrlX2 = endX - 40;
                
                svgContent += `
                    <path d="M ${startX},${startY} C ${ctrlX1},${startY} ${ctrlX2},${endY} ${endX},${endY}" fill="none" stroke="#e74c3c" stroke-width="2" />
                `;
            }
        });
    }
    
    // Draw the nodes on top of edges
    gates.forEach(gate => {
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
    let inputArrayMap = {};
    if (graph_nodes && graph_nodes.nodes) {
        let inputs = graph_nodes.nodes.filter(n => n.type === "INPUT");
        inputs.forEach((inp, idx) => {
             let pin = pinCounter + idx;
             cpp += `    pinMode(${pin}, INPUT_PULLUP);\n`;
             inputArrayMap[inp.id] = pin;
        });
    }
    
    cpp += `}\n\n`;
    cpp += `void loop() {\n`;
    
    // read hardware pins
    cpp += `    // reading physical switches into memory\n`;
    for (const [id, pin] of Object.entries(inputArrayMap)) {
        let safeId = id.replace(/[^a-zA-Z0-9]/g, "_");
        cpp += `    bool var_${safeId} = !digitalRead(${pin}); // active low\n`;
    }
    
    // logic string build up
    // mostly stubbed for now until the AST transverser is built
    cpp += `    // evaluate inputs and outputs via mapped gates\n`;
    
    // sort based on depth so C++ variables are created before assigned downstream
    if (collapsed_nodes && collapsed_nodes.length > 0) {
        collapsed_nodes.sort((a,b) => (a.depth || 0) - (b.depth || 0));
        
        collapsed_nodes.forEach(gn => {
             cpp += `    // processing ${gn.type} gate at ${gn.id}\n`;
             
             // resolve upstream AST references natively instead of hardcoded 'input_A'
             let upstreams = [];
             if (graph_nodes.edges) {
                 graph_nodes.edges.filter(e => e.to === gn.id).forEach(e => {
                     upstreams.push(`var_${e.from.replace(/[^a-zA-Z0-9]/g, "_")}`);
                 });
             }
             let safeId = `var_${gn.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
             
             // fill missing upstreams with defaults to prevent C++ compiler crash
             let argA = upstreams.length > 0 ? upstreams[0] : "false";
             let argB = upstreams.length > 1 ? upstreams[1] : "false";
             
             if (gn.type === "AND") {
                 cpp += `    bool ${safeId} = ${argA} && ${argB};\n`;
             } else if (gn.type === "NOT") {
                 cpp += `    bool ${safeId} = !${argA};\n`;
             } else if (gn.type === "OR") {
                 cpp += `    bool ${safeId} = ${argA} || ${argB};\n`;
             } else if (gn.type === "NOR") {
                 cpp += `    bool ${safeId} = !(${argA} || ${argB});\n`;
             } else if (gn.type === "NAND") {
                 cpp += `    bool ${safeId} = !(${argA} && ${argB});\n`;
             } else if (gn.type === "XOR") {
                 cpp += `    bool ${safeId} = ${argA} ^ ${argB};\n`;
             } else if (gn.type === "SR_LATCH") {
                 cpp += `    static bool state_${safeId} = false;\n`;
                 cpp += `    if (${argA}) state_${safeId} = true;\n`;
                 cpp += `    if (${argB}) state_${safeId} = false;\n`;
                 cpp += `    bool ${safeId} = state_${safeId};\n`;
             } else if (gn.type === "DELAY") {
                 cpp += `    delay(${gn.delay_ms}); // translated buffer tick wait\n`;
             }
        });
        
        // mapping outputs for the arduino digital pins
        cpp += `\n    // final output writes\n`;
        let outputs = collapsed_nodes.filter(n => n.type === "DELAY" || n.type === "AND" || n.type === "OR" || n.type === "NOR" || n.type === "NAND" || n.type === "XOR" || n.type === "SR_LATCH");
        outputs.forEach((out_node, idx) => {
             cpp += `    digitalWrite(${8 + idx}, ${out_node.id.replace(/[^a-zA-Z0-9]/g, "_")});\n`;
        });
    }
    
    cpp += `}\n`;
    
    document.getElementById("cpp_out").innerText = cpp;
}
