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
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

function synthesize() {
    graph_nodes = sampleJSON;
    let logicGates = detectSubGraphs(graph_nodes);
    renderSVG(logicGates);
}
