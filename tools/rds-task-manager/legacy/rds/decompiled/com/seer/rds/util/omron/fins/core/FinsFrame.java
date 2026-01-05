/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsFrame
 *  com.seer.rds.util.omron.fins.core.FinsNodeAddress
 *  com.seer.rds.util.omron.fins.core.util.StringUtilities
 */
package com.seer.rds.util.omron.fins.core;

import com.seer.rds.util.omron.fins.core.FinsNodeAddress;
import com.seer.rds.util.omron.fins.core.util.StringUtilities;
import java.nio.ByteBuffer;

public class FinsFrame {
    private final byte informationControlField;
    private final byte reserved = 0;
    private final byte gatewayCount = (byte)2;
    private final byte destinationNetworkAddress;
    private final byte destinationNodeNumber;
    private final byte destinationUnitAddress;
    private final byte sourceNetworkAddress;
    private final byte sourceNodeNumber;
    private final byte sourceUnitAddress;
    private final byte serviceAddress;
    private final byte[] data;

    public FinsFrame(byte informationControlField, byte gateywayCount, byte destinationNetworkAddress, byte destinationNodeNumber, byte destinationUnitAddress, byte sourceNetworkAddress, byte sourceNodeNumber, byte sourceUnitAddress, byte serviceAddress, byte[] data) {
        this.informationControlField = informationControlField;
        this.destinationNetworkAddress = destinationNetworkAddress;
        this.destinationNodeNumber = destinationNodeNumber;
        this.destinationUnitAddress = destinationUnitAddress;
        this.sourceNetworkAddress = sourceNetworkAddress;
        this.sourceNodeNumber = sourceNodeNumber;
        this.sourceUnitAddress = sourceUnitAddress;
        this.serviceAddress = serviceAddress;
        this.data = data;
    }

    public byte getInformationControlField() {
        return this.informationControlField;
    }

    public byte getReserved() {
        return 0;
    }

    public byte getGatewayCount() {
        return 2;
    }

    public FinsNodeAddress getDestinationAddress() {
        return new FinsNodeAddress(this.getDestinationNetworkAddress(), this.getDestinationNodeNumber(), this.getDestinationUnitAddress());
    }

    public byte getDestinationNetworkAddress() {
        return this.destinationNetworkAddress;
    }

    public byte getDestinationNodeNumber() {
        return this.destinationNodeNumber;
    }

    public byte getDestinationUnitAddress() {
        return this.destinationUnitAddress;
    }

    public FinsNodeAddress getSourceAddress() {
        return new FinsNodeAddress(this.getSourceNetworkAddress(), this.getSourceNodeNumber(), this.getSourceUnitAddress());
    }

    public byte getSourceNetworkAddress() {
        return this.sourceNetworkAddress;
    }

    public byte getSourceNodeNumber() {
        return this.sourceNodeNumber;
    }

    public byte getSourceUnitAddress() {
        return this.sourceUnitAddress;
    }

    public byte getServiceAddress() {
        return this.serviceAddress;
    }

    public byte[] getData() {
        return this.data;
    }

    public boolean isCommand() {
        return (this.informationControlField & 0x40) == 0;
    }

    public boolean isResponse() {
        return (this.informationControlField & 0x40) != 0;
    }

    public boolean isResponseRequired() {
        return (this.informationControlField & 1) == 0;
    }

    public byte[] toByteArray() {
        int frameLength = 10 + this.getData().length;
        byte[] data = new byte[frameLength];
        ByteBuffer buf = ByteBuffer.allocate(frameLength);
        buf.put(this.getInformationControlField()).put((byte)0).put(this.getGatewayCount()).put(this.getDestinationNetworkAddress()).put(this.getDestinationNodeNumber()).put(this.getDestinationUnitAddress()).put(this.getSourceNetworkAddress()).put(this.getSourceNodeNumber()).put(this.getSourceUnitAddress()).put(this.getServiceAddress()).put(this.getData()).flip();
        buf.get(data);
        return data;
    }

    public String toString() {
        return String.format("FINS dst[%02x-%02x-%02x] src[%02x-%02x-%02x] svc[0x%02x] data[%s]", this.getDestinationNetworkAddress(), this.getDestinationNodeNumber(), this.getDestinationUnitAddress(), this.getSourceNetworkAddress(), this.getSourceNodeNumber(), this.getSourceUnitAddress(), this.getServiceAddress(), StringUtilities.getHexString((byte[])this.getData()));
    }
}

