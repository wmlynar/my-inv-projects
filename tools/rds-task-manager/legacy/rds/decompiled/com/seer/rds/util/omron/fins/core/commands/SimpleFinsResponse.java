/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsResponse
 *  com.seer.rds.util.omron.fins.core.commands.SimpleFinsResponse
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsEndCode;
import com.seer.rds.util.omron.fins.core.commands.FinsResponse;

public abstract class SimpleFinsResponse
implements FinsResponse {
    private final FinsCommandCode commandCode;
    private final FinsEndCode endCode;

    protected SimpleFinsResponse(FinsCommandCode commandCode, FinsEndCode endCode) {
        this.commandCode = commandCode;
        this.endCode = endCode;
    }

    public FinsCommandCode getCommandCode() {
        return this.commandCode;
    }

    public FinsEndCode getEndCode() {
        return this.endCode;
    }
}

