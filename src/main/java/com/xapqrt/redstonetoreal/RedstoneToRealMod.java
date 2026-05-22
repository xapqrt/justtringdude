package com.xapqrt.redstonetoreal;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import static net.minecraft.server.command.CommandManager.*;
import net.minecraft.text.Text;
import net.minecraft.util.math.BlockPos;

public class RedstoneToRealMod implements ModInitializer {
    @Override
    public void onInitialize() {
        System.out.println("Redstone-to-Real Mod Initialized!");
        
        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
            dispatcher.register(literal("scanredstone")
                .executes(context -> {
                    BlockPos playerPos = context.getSource().getPlayer().getBlockPos();
                    RedstoneScanner scanner = new RedstoneScanner();
                    
                    context.getSource().sendFeedback(() -> Text.literal("Scanning chunks for redstone logic..."), false);
                    scanner.scanChunk(context.getSource().getWorld(), playerPos.add(-8, 0, -8));
                    scanner.saveGraphToFile();
                    context.getSource().sendFeedback(() -> Text.literal("DAG Extracted to redstone_graph.json!"), false);
                    
                    return 1;
                }));
        });
    }
}