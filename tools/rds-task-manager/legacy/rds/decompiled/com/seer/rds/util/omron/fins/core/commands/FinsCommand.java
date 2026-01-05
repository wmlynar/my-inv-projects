/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;

public interface FinsCommand {
    public FinsCommandCode getCommandCode();

    public byte[] getBytes();
}

