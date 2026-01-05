/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadResponse
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadWordResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsEndCode;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadResponse;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public final class FinsMemoryAreaReadWordResponse
extends FinsMemoryAreaReadResponse<Short> {
    private static final Logger logger = LoggerFactory.getLogger(FinsMemoryAreaReadWordResponse.class);

    public FinsMemoryAreaReadWordResponse(FinsEndCode errorCode, List<Short> items) {
        super(errorCode, items);
    }

    public byte[] getBytes() {
        ByteBuffer buf = ByteBuffer.allocate(512);
        buf.putShort(this.getCommandCode().getValue());
        buf.putShort(this.getEndCode().getValue());
        List items = this.getItems();
        buf.putShort((short)items.size());
        items.forEach(buf::putShort);
        buf.flip();
        byte[] bytes = new byte[buf.remaining()];
        buf.get(bytes);
        return bytes;
    }

    public static FinsMemoryAreaReadWordResponse parseFrom(byte[] data, short itemCount) {
        ByteBuffer buf = ByteBuffer.wrap(data);
        FinsCommandCode commandCode = (FinsCommandCode)FinsCommandCode.valueOf((short)buf.getShort()).get();
        short endCodeRaw = buf.getShort();
        if (((long)endCodeRaw & 0x8000L) != 0L) {
            logger.debug("A network relay error, probably need to read more bytes");
            short relayError = buf.getShort();
            logger.debug(String.format("Relay error 0x%04x", relayError));
        }
        if (((long)endCodeRaw & 0x80L) != 0L) {
            logger.debug("A fatal CPU error");
        }
        if (((long)endCodeRaw & 0x40L) != 0L) {
            logger.debug("A minor CPU error");
        }
        FinsEndCode endCode = (FinsEndCode)FinsEndCode.valueOf((short)endCodeRaw).get();
        if (commandCode != FinsCommandCode.MEMORY_AREA_READ) {
            logger.debug("invalid command code {} for the response type", (Object)commandCode);
        }
        ArrayList<Short> items = new ArrayList<Short>();
        if (endCode == FinsEndCode.NORMAL_COMPLETION) {
            for (int i = 0; i < itemCount; ++i) {
                items.add(buf.getShort());
            }
        }
        return new FinsMemoryAreaReadWordResponse(endCode, items);
    }

    public static FinsMemoryAreaReadWordResponse parseFrom(byte[] data, int itemCount) {
        return FinsMemoryAreaReadWordResponse.parseFrom((byte[])data, (short)((short)itemCount));
    }
}

