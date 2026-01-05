/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteResponse
 *  com.seer.rds.util.omron.fins.core.commands.SimpleFinsResponse
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsEndCode;
import com.seer.rds.util.omron.fins.core.commands.SimpleFinsResponse;
import java.nio.ByteBuffer;

public class FinsMemoryAreaWriteResponse
extends SimpleFinsResponse {
    public FinsMemoryAreaWriteResponse(FinsEndCode endCode) {
        super(FinsCommandCode.MEMORY_AREA_WRITE, endCode);
    }

    public byte[] getBytes() {
        ByteBuffer buf = ByteBuffer.allocate(4);
        buf.putShort(this.getCommandCode().getValue());
        buf.putShort(this.getEndCode().getValue());
        return (byte[])buf.array().clone();
    }

    public static FinsMemoryAreaWriteResponse parseFrom(byte[] data) {
        ByteBuffer buf = ByteBuffer.wrap(data);
        FinsCommandCode commandCode = (FinsCommandCode)FinsCommandCode.valueOf((short)buf.getShort()).get();
        FinsEndCode endCode = (FinsEndCode)FinsEndCode.valueOf((short)buf.getShort()).get();
        if (commandCode != FinsCommandCode.MEMORY_AREA_WRITE) {
            // empty if block
        }
        return new FinsMemoryAreaWriteResponse(endCode);
    }
}

