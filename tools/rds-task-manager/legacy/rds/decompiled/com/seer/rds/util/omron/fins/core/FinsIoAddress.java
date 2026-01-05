/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.FinsIoMemoryArea
 */
package com.seer.rds.util.omron.fins.core;

import com.seer.rds.util.omron.fins.core.FinsIoMemoryArea;
import java.nio.ByteBuffer;

public final class FinsIoAddress {
    private final FinsIoMemoryArea memoryArea;
    private final short address;
    private final byte bitOffset;

    public FinsIoAddress(FinsIoMemoryArea memoryArea, short address) {
        this(memoryArea, address, 0);
    }

    public FinsIoAddress(FinsIoMemoryArea memoryArea, int address) {
        this(memoryArea, (short)address);
    }

    public FinsIoAddress(FinsIoMemoryArea memoryArea, int address, int bitOffset) {
        this(memoryArea, (short)address, (byte)bitOffset);
    }

    public FinsIoAddress(FinsIoMemoryArea memoryArea, short address, int bitOffset) {
        this(memoryArea, address, (byte)bitOffset);
    }

    public FinsIoAddress(FinsIoMemoryArea memoryArea, short address, byte bitOffset) {
        this.memoryArea = memoryArea;
        this.address = address;
        this.bitOffset = bitOffset;
    }

    public FinsIoMemoryArea getMemoryArea() {
        return this.memoryArea;
    }

    public short getAddress() {
        return this.address;
    }

    public byte getBitOffset() {
        return this.bitOffset;
    }

    public static FinsIoAddress parseFrom(int addressOrdinal) {
        ByteBuffer buf = ByteBuffer.allocate(8);
        buf.putInt(addressOrdinal);
        buf.flip();
        FinsIoMemoryArea memoryAreaCode = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)buf.get()).get();
        short address = buf.getShort();
        byte bitOffset = buf.get();
        return new FinsIoAddress(memoryAreaCode, address, bitOffset);
    }
}

