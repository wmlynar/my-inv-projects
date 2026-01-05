/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadCommand
 *  com.seer.rds.util.omron.fins.core.commands.SimpleAddressableFinsCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.commands.SimpleAddressableFinsCommand;
import java.nio.ByteBuffer;

public final class FinsMemoryAreaReadCommand
extends SimpleAddressableFinsCommand {
    private final short itemCount;

    public FinsMemoryAreaReadCommand(FinsIoAddress address, short itemCount) {
        super(FinsCommandCode.MEMORY_AREA_READ, address);
        this.itemCount = itemCount;
    }

    public FinsMemoryAreaReadCommand(FinsIoAddress address, int itemCount) {
        this(address, (short)itemCount);
    }

    public byte[] getBytes() {
        ByteBuffer buf = ByteBuffer.allocate(8);
        buf.putShort(this.getCommandCode().getValue());
        buf.put(this.getIoAddress().getMemoryArea().getValue());
        buf.putShort(this.getIoAddress().getAddress());
        buf.put(this.getIoAddress().getBitOffset());
        buf.putShort(this.itemCount);
        buf.flip();
        byte[] bytes = new byte[buf.remaining()];
        buf.get(bytes);
        return bytes;
    }
}

