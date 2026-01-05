/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.MemoryAreaWriteCommandHandler
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteResponse
 */
package com.seer.rds.util.omron.fins.core;

import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteResponse;

@FunctionalInterface
public interface MemoryAreaWriteCommandHandler {
    public FinsMemoryAreaWriteResponse handle(FinsMemoryAreaWriteCommand var1);
}

