/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.commands.SimpleAddressableFinsCommand
 *  com.seer.rds.util.omron.fins.core.commands.SimpleFinsCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.commands.SimpleFinsCommand;

public abstract class SimpleAddressableFinsCommand
extends SimpleFinsCommand {
    private final FinsIoAddress ioAddress;

    public SimpleAddressableFinsCommand(FinsCommandCode commandCode, FinsIoAddress ioAddress) {
        super(commandCode);
        this.ioAddress = ioAddress;
    }

    public FinsIoAddress getIoAddress() {
        return this.ioAddress;
    }
}

