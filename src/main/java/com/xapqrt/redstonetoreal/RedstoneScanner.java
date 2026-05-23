package com.xapqrt.redstonetoreal;

import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.block.ComparatorBlock;
import net.minecraft.block.RedstoneTorchBlock;
import net.minecraft.block.RepeaterBlock;
import net.minecraft.block.enums.ComparatorMode;
import net.minecraft.state.property.Properties;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Direction;
import net.minecraft.world.World;
import java.util.ArrayList;
import java.util.List;

public class RedstoneScanner {
    
    // fabric API documentation is literally hiding this from me
    
    // store inputs found in the world
    public List<BlockPos> raw_inputs = new ArrayList<>();
    
    // logic components
    public List<String> comp_cache = new ArrayList<>();
    
    // valid directed edges from crosstalk algo
    public List<String> valid_edges = new ArrayList<>();
    
    public String graph_nodes = "{\"nodes\":[], \"edges\":[]}";
    
    
    
    
    
    
    
    
    
    // idk why redstone dust connects diagonally sometimes, hacking a fix here
    public void detectCrosstalk(World world, BlockPos wirePos) {
        System.out.println("CROSSTALK DETECTED FUCK");
        
        BlockState wire_state = world.getBlockState(wirePos);
        int wire_power = wire_state.contains(Properties.POWER) ? wire_state.get(Properties.POWER) : 0;
        
        // strict collision-detection algo
        // differentiate between a redstone wire actively powering vs merely running adjacent
        for (Direction dir : Direction.values()) {
            BlockPos adjacent_thing = wirePos.offset(dir);
            BlockState adj = world.getBlockState(adjacent_thing);
            
            // if power is flowing via weak power, it's not actually connected as an edge
            // placeholder for deep connection verification
            if (adj.isOf(Blocks.REDSTONE_WIRE)) {
                valid_edges.add(wirePos.toShortString() + "->" + adjacent_thing.toShortString());
            } else if (adj.isOf(Blocks.REDSTONE_TORCH)) {
                // Torch outputs to adjacent wires
                System.out.println("wire connected to torch at " + adjacent_thing);
                valid_edges.add(adjacent_thing.toShortString() + "->" + wirePos.toShortString());
            } else if (adj.isOf(Blocks.REPEATER)) {
                Direction facing = adj.get(Properties.HORIZONTAL_FACING);
                if (dir == facing) {
                    // Wire is behind the repeater (input side)
                    System.out.println("wire feeds into repeater at " + adjacent_thing);
                    valid_edges.add(wirePos.toShortString() + "->" + adjacent_thing.toShortString());
                } else if (dir == facing.getOpposite()) {
                    // Wire is in front of the repeater (output side)
                    System.out.println("repeater outputs to wire at " + adjacent_thing);
                    valid_edges.add(adjacent_thing.toShortString() + "->" + wirePos.toShortString());
                }
            } else if (adj.isSolidBlock(world, adjacent_thing)) {
                // strong power injection block check
                System.out.println("found a solid block, checking for strong power injection");
                valid_edges.add(wirePos.toShortString() + "->" + adjacent_thing.toShortString());
            } else if (adj.isOf(Blocks.REDSTONE_BLOCK) || adj.isOf(Blocks.LEVER)) {
                // tracing backwards from power source
                valid_edges.add(adjacent_thing.toShortString() + "->" + wirePos.toShortString());
            }
        }
    }
    
    // I am losing my mind over Java string building
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    public String buildJSON() {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n  \"nodes\": [\n");
        // populate nodes from components and inputs
        
        for (int i = 0; i < comp_cache.size(); i++) {
            String c = comp_cache.get(i);
            String[] parts = c.split(":");
            
            // parsing delay and facing is gross in java
            StringBuilder extra_props = new StringBuilder();
            for (int p = 2; p < parts.length; p++) {
                String[] kv = parts[p].split("=");
                if (kv.length == 2) {
                    extra_props.append(", \"").append(kv[0]).append("\": \"").append(kv[1]).append("\"");
                }
            }












            sb.append("    {\"id\": \"").append(parts[1]).append("\", \"type\": \"").append(parts[0]).append("\"").append(extra_props.toString()).append("}");
            if (i < comp_cache.size() - 1 || raw_inputs.size() > 0) sb.append(",\n");
        }
        
        // append raw inputs so the web app can use them
        for (int i = 0; i < raw_inputs.size(); i++) {
            sb.append("    {\"id\": \"").append(raw_inputs.get(i).toShortString()).append("\", \"type\": \"INPUT\"}");
            if (i < raw_inputs.size() - 1) sb.append(",\n");
        }
        
        
        sb.append("\n  ],\n  \"edges\": [\n");
        
        for (int i = 0; i < valid_edges.size(); i++) {
            String[] e = valid_edges.get(i).split("->");
            sb.append("    {\"from\": \"").append(e[0]).append("\", \"to\": \"").append(e[1]).append("\"}");
            if (i < valid_edges.size() - 1) sb.append(",\n");
        }
        sb.append("\n  ]\n}");
        return sb.toString();
    }
    
    public String exportDAG() {
        // dynamically populate this from comp_cache and wire data
        return buildJSON();
    }
    
    public void saveGraphToFile() {
        try {
            // dumping out to the run directory so the web app can read it
            java.nio.file.Files.writeString(java.nio.file.Paths.get("redstone_graph.json"), graph_nodes);
            System.out.println("Graph saved successfully to redstone_graph.json");
        } catch (Exception e) {
            System.out.println("Failed to write JSON ugh");
            e.printStackTrace();
        }
    }
    
    public void scanChunk(World world, BlockPos startPos) {
        
        System.out.println("Beginning chunk scan...");
        
        for (int x = 0; x < 16; x++) {
            for (int z = 0; z < 16; z++) {
                for (int y = -64; y < 320; y++) {
                    BlockPos block_thing = startPos.add(x, y, z);
                    BlockState current_state = world.getBlockState(block_thing);
                    
                    if (current_state.isOf(Blocks.LEVER) || current_state.isOf(Blocks.STONE_BUTTON) || current_state.isOf(Blocks.OAK_BUTTON)) {
                        System.out.println("FOUND INPUT FUCK");
                        raw_inputs.add(block_thing);
                    }
                    
                    if (current_state.isOf(Blocks.REDSTONE_TORCH) || current_state.isOf(Blocks.REDSTONE_WALL_TORCH)) {
                        boolean is_lit = current_state.get(Properties.LIT);
                        Direction facing = current_state.contains(Properties.HORIZONTAL_FACING) ? current_state.get(Properties.HORIZONTAL_FACING) : Direction.UP;
                        comp_cache.add("NOT_GATE:" + block_thing.toShortString() + ":facing=" + facing.getName() + ":lit=" + is_lit);
                        System.out.println("Captured NOT gate at " + block_thing);
                    }
                    
                    if (current_state.isOf(Blocks.REPEATER)) {
                        Direction facing = current_state.get(Properties.HORIZONTAL_FACING);
                        int delay = current_state.get(RepeaterBlock.DELAY);
                        comp_cache.add("BUFFER:" + block_thing.toShortString() + ":facing=" + facing.getName() + ":delay=" + delay);
                        System.out.println("Captured Repeater (delay="+delay+") at " + block_thing);
                    }
                    
                    if (current_state.isOf(Blocks.COMPARATOR)) {
                        Direction facing = current_state.get(Properties.HORIZONTAL_FACING);
                        ComparatorMode mode = current_state.get(ComparatorBlock.MODE);
                        comp_cache.add("COMPARATOR:" + block_thing.toShortString() + ":facing=" + facing.getName() + ":mode=" + mode.asString());
                    }
                    
                    if (current_state.isOf(Blocks.REDSTONE_WIRE)) {
                        detectCrosstalk(world, block_thing);
                    }
                }
            }
        }
        
        graph_nodes = exportDAG();
    }
}
