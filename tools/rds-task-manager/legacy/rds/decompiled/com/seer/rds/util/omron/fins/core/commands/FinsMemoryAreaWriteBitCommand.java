/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteBitCommand
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.List;

public class FinsMemoryAreaWriteBitCommand
extends FinsMemoryAreaWriteCommand {
    private final List<Boolean> items;

    public FinsMemoryAreaWriteBitCommand(FinsIoAddress address, List<Boolean> items) {
        super(FinsCommandCode.MEMORY_AREA_WRITE, address);
        this.items = items;
    }

    public List<Boolean> getItems() {
        return Collections.unmodifiableList(this.items);
    }

    public byte[] getBytes() {
        ByteBuffer buf = ByteBuffer.allocate(512);
        buf.putShort(this.getCommandCode().getValue());
        buf.put(this.getIoAddress().getMemoryArea().getValue());
        buf.putShort(this.getIoAddress().getAddress());
        buf.put(this.getIoAddress().getBitOffset());
        List items = this.getItems();
        buf.putShort((short)items.size());
        items.forEach(item -> buf.put(item != false ? (byte)1 : (byte)0));
        buf.flip();
        byte[] bytes = new byte[buf.remaining()];
        buf.get(bytes);
        return bytes;
    }
}

