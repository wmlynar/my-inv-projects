/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.Bit
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadBitResponse
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadResponse
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.Bit;
import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsEndCode;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadResponse;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

public final class FinsMemoryAreaReadBitResponse
extends FinsMemoryAreaReadResponse<Bit> {
    public FinsMemoryAreaReadBitResponse(FinsEndCode errorCode, List<Bit> items) {
        super(errorCode, items);
    }

    public byte[] getBytes() {
        ByteBuffer buf = ByteBuffer.allocate(512);
        buf.putShort(this.getCommandCode().getValue());
        buf.putShort(this.getEndCode().getValue());
        List items = this.getItems();
        buf.putShort((short)items.size());
        items.forEach(item -> buf.put(item.getBitData()));
        buf.flip();
        byte[] bytes = new byte[buf.remaining()];
        buf.get(bytes);
        return bytes;
    }

    public static FinsMemoryAreaReadBitResponse parseFrom(byte[] data, short itemCount) {
        ByteBuffer buf = ByteBuffer.wrap(data);
        FinsCommandCode commandCode = (FinsCommandCode)FinsCommandCode.valueOf((short)buf.getShort()).get();
        FinsEndCode endCode = (FinsEndCode)FinsEndCode.valueOf((short)buf.getShort()).get();
        if (commandCode != FinsCommandCode.MEMORY_AREA_READ) {
            // empty if block
        }
        ArrayList items = new ArrayList();
        IntStream.range(0, itemCount).forEach(i -> {
            byte bitData = buf.get();
            items.add(new Bit(bitData));
        });
        return new FinsMemoryAreaReadBitResponse(endCode, items);
    }
}

