# Redstone-to-Real

A physical bridging project that maps 3D Minecraft Redstone circuitry built in-game directly into physical Arduino circuitry. 

## Two-Part Pipeline
1. **The Fabric Mod**: Scans chunks extracting Redstone Blockstates, calculates directional Crosstalk using strong-power logic evaluation, and outputs a valid Directed Acyclic Graph (DAG) JSON. 
2. **The Logic Synthesizer**: A Node Web Viewer that ingests the Graph JSON, evaluates sub-graph isomorphism logic to aggregate combinations of repeaters and torches into `NOR`, `NAND`, `XOR`, etc, and dynamically renders the board via auto-routing Spline SVG.

It concludes by generating valid `.ino` C++ scripts mapped automatically against physical Arduino boards to output true boolean algebra.

### Getting Started 
Refer to `TESTING.md` for in-game execution.