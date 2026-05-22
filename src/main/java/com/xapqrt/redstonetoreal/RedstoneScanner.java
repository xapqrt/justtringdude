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
                int adj_power = adj.contains(Properties.POWER) ? adj.get(Properties.POWER) : 0;
                
                // redstone goes down by 1 each block, so strict check
                if (wire_power > adj_power) {
                    System.out.println("power flows from " + wirePos + " -> " + adjacent_thing);
                    // we save this valid flow to trace later
                    valid_edges.add(wirePos.toShortString() + "->" + adjacent_thing.toShortString());
                }
            } else if (adj.isOf(Blocks.REPEATER) || adj.isOf(Blocks.REDSTONE_TORCH)) {
                // it hits a component
                System.out.println("wire hit a component at " + adjacent_thing);
                valid_edges.add(wirePos.toShortString() + "->" + adjacent_thing.toShortString());
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
            sb.append("    {\"id\": \"").append(parts[1]).append("\", \"type\": \"").append(parts[0]).append("\"}");
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
                    }
                    
                    if (current_state.isOf(Blocks.REPEATER)) {
                        Direction facing = current_state.get(Properties.HORIZONTAL_FACING);
                        int delay = current_state.get(RepeaterBlock.DELAY);
                        comp_cache.add("BUFFER:" + block_thing.toShortString() + ":facing=" + facing.getName() + ":delay=" + delay);
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
