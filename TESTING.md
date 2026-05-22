# Testing Guide

1. Start up Minecraft (Fabric) via `./gradlew runClient`.
2. Build an active Redstone logic circuit with Levers (Input), Repeaters (Delay/Buffer), Torches (NOT). 
3. Connect Torches powering into Repeaters to test AST sorting.
4. Run `/scanredstone` while standing beside the logic rig.
5. Exit game, navigate into the Mod execution folder and locate `redstone_graph.json`.
6. Open `/webapp/index.html` in Chrome/Firefox.
7. Click `Choose File`, upload `redstone_graph.json`.
8. Click `Run Isomorphic Matcher` - the SVG paths should bezier-route without overlap!
9. Click `Generate Arduino Code` - a proper `.ino` snippet evaluating exact upstream states logic variables should output.