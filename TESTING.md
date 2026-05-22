# Master Testing Guide & Execution Manual

This document outlines the strict protocol for running the Redstone-to-Real toolchain. **Read this carefully**, especially if you run into environment issues like missing Java runtimes or Gradle failures.

## Phase 1: Environment Setup

1. **Install Java 17**: Minecraft 1.20+ runs strictly on Java 17. 
   - *Mac/Homebrew*: `brew install openjdk@17` and map it to your shell.
   - Verify with: `java -version`. It must state `17.x`.
2. **Validate the Gradle Wrapper**: The repository now comes baked with `./gradlew`, which handles dependency provisioning offline.
   - Run `chmod +x gradlew` (Mac/Linux) to ensure it is executable.

## Phase 2: In-Game Redstone Extraction

1. **Run the Fabric Client**:
   ```bash
   ./gradlew runClient
   ```
   *Note: First-time boot will take 2-5 minutes as Gradle downloads the Minecraft 1.20 mapped assets.*
2. **Create a Test World**: Generate a new Singleplayer world in Creative mode.
3. **Build the Logic Rig**:
   - Build a discrete logic construct.
   - Use `minecraft:lever` as input nodes.
   - Route `minecraft:redstone_wire` leading into `minecraft:repeater`s and `minecraft:redstone_torch`es. 
   - Stand close to your construct! The script scans a 16x16 chunk area anchored to your position.
4. **Trigger the Scan**: Type this command into the chat:
   `/scanredstone`
5. **Verify the Export**: You should see console outputs tracing logic streams, hitting components. It will successfully save a file internally named `redstone_graph.json` inside the `run/` sub-directory locally.

## Phase 3: The Web Logic App & Isomorphic Transpilation

Because we use the embedded Javascript `FileReader` web API, you **do not** need an active NPM/Node/Python web server.

1. **Open the App**: Simply Double-Click the `webapp/index.html` file on your host machine to open it directly in Chrome, Firefox, or Safari (`file://` protocol works perfectly).
2. **Upload the Graph**:
   - Click `Choose File`.
   - Navigate into your Mod workspace root, go into the `run/` folder, and select `redstone_graph.json` (the output from Phase 2).
3. **Synthesize & Map**:
   - Click **Run Isomorphic Matcher**.
   - You should instantly see bounding boxes of standard logic gates (e.g., AND, OR, DELAY) connected via bezier curved edges spanning left-to-right. Overlapping is prevented via Y-axis topological tracking.
4. **Generate C++ Loop**:
   - Click **Generate Arduino Code**.
   - The embedded compiler parses topological node assignments safely parsing boolean logic downstream (`bool var_T_5 = var_T_1 || var_in_2`).
   - Click **Copy C++** and paste this over to your Arduino IDE. Upload to hardware loop and match the wire mappings!