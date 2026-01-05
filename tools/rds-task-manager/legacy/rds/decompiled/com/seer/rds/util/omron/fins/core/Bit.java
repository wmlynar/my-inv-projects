/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.Bit
 */
package com.seer.rds.util.omron.fins.core;

public final class Bit {
    private static final byte VALUE_MASK = 1;
    private static final byte FORCED_MASK = 2;
    private final byte bitData;

    public Bit(byte bitData) {
        this.bitData = bitData;
    }

    public boolean getValue() {
        return (this.bitData & 1) != 0;
    }

    public boolean isForced() {
        return (this.bitData & 2) != 0;
    }

    public byte getBitData() {
        return this.bitData;
    }
}

