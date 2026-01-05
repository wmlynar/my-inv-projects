/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsResponse
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsEndCode;

public interface FinsResponse {
    public FinsCommandCode getCommandCode();

    public FinsEndCode getEndCode();

    public byte[] getBytes();
}

