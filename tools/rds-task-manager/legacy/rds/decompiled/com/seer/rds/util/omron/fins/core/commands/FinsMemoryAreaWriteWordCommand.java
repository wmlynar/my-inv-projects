/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteWordCommand
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteCommand;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.List;

public class FinsMemoryAreaWriteWordCommand
extends FinsMemoryAreaWriteCommand {
    private final List<Short> items;

    public FinsMemoryAreaWriteWordCommand(FinsIoAddress address, List<Short> items) {
        super(FinsCommandCode.MEMORY_AREA_WRITE, address);
        this.items = items;
    }

    public List<Short> getItems() {
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
        items.forEach(buf::putShort);
        buf.flip();
        byte[] bytes = new byte[buf.remaining()];
        buf.get(bytes);
        return bytes;
    }
}

