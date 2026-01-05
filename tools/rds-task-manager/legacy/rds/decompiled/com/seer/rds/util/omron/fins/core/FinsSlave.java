/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsSlave
 *  com.seer.rds.util.omron.fins.core.FinsSlaveException
 *  com.seer.rds.util.omron.fins.core.MemoryAreaWriteCommandHandler
 */
package com.seer.rds.util.omron.fins.core;

import com.seer.rds.util.omron.fins.core.FinsSlaveException;
import com.seer.rds.util.omron.fins.core.MemoryAreaWriteCommandHandler;
import java.util.Optional;

public interface FinsSlave
extends AutoCloseable {
    public void start() throws FinsSlaveException;

    public void shutdown();

    public void setMemoryAreaWriteHandler(MemoryAreaWriteCommandHandler var1);

    public Optional<MemoryAreaWriteCommandHandler> getMemoryAreaWriteHandler();
}

