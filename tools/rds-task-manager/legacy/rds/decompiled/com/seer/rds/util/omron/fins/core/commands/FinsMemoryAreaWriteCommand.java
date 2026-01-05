/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand
 *  com.seer.rds.util.omron.fins.core.commands.SimpleAddressableFinsCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.commands.SimpleAddressableFinsCommand;

public abstract class FinsMemoryAreaWriteCommand
extends SimpleAddressableFinsCommand {
    public FinsMemoryAreaWriteCommand(FinsCommandCode commandCode, FinsIoAddress ioAddress) {
        super(commandCode, ioAddress);
    }
}

