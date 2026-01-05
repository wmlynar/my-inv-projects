/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsCommand
 *  com.seer.rds.util.omron.fins.core.commands.SimpleFinsCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.commands.FinsCommand;

public abstract class SimpleFinsCommand
implements FinsCommand {
    private final FinsCommandCode commandCode;

    protected SimpleFinsCommand(FinsCommandCode commandCode) {
        this.commandCode = commandCode;
    }

    public FinsCommandCode getCommandCode() {
        return this.commandCode;
    }
}

