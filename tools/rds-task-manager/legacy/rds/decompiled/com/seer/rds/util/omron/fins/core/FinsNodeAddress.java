/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsNodeAddress
 */
package com.seer.rds.util.omron.fins.core;

public final class FinsNodeAddress {
    private final byte address;
    private final byte node;
    private final byte unit;

    public FinsNodeAddress(byte address, byte node, byte unit) {
        this.address = address;
        this.node = node;
        this.unit = unit;
    }

    public FinsNodeAddress(int address, int node, int unit) {
        this((byte)address, (byte)node, (byte)unit);
    }

    public byte getAddress() {
        return this.address;
    }

    public byte getNode() {
        return this.node;
    }

    public byte getUnit() {
        return this.unit;
    }
}

