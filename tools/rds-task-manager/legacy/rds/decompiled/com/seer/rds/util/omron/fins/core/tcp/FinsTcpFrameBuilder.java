/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpCommandCode
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpErrorCode
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrame
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameBuilder
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameBuilderException
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameException
 */
package com.seer.rds.util.omron.fins.core.tcp;

import com.seer.rds.util.omron.fins.core.tcp.FinsTcpCommandCode;
import com.seer.rds.util.omron.fins.core.tcp.FinsTcpErrorCode;
import com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrame;
import com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameBuilderException;
import com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

public class FinsTcpFrameBuilder {
    private FinsTcpCommandCode commandCode;
    private FinsTcpErrorCode errorCode;
    private byte[] data;

    public FinsTcpFrameBuilder setCommandCode(FinsTcpCommandCode commandCode) {
        this.commandCode = commandCode;
        return this;
    }

    public FinsTcpFrameBuilder setErrorCode(FinsTcpErrorCode errorCode) {
        this.errorCode = errorCode;
        return this;
    }

    public FinsTcpFrameBuilder setData(byte[] data) {
        this.data = data;
        return this;
    }

    public FinsTcpFrame build() {
        int length = this.data.length + 8;
        return new FinsTcpFrame(Integer.valueOf(length), this.commandCode, Optional.ofNullable(this.errorCode).orElse(FinsTcpErrorCode.NORMAL), this.data);
    }

    public static FinsTcpFrame parseFrom(byte[] frameBytes) throws FinsTcpFrameException, FinsTcpFrameBuilderException {
        ByteBuffer buf = ByteBuffer.wrap(frameBytes);
        byte[] headerBytes = new byte[4];
        buf.get(headerBytes);
        String header = new String(headerBytes, StandardCharsets.US_ASCII);
        if (!header.equals("FINS")) {
            throw new FinsTcpFrameException("FINS/TCP header != \"FINS\"");
        }
        int length = buf.getInt();
        int commandCodeInt = buf.getInt();
        FinsTcpCommandCode commandCode = (FinsTcpCommandCode)FinsTcpCommandCode.valueOf((int)commandCodeInt).orElseThrow(() -> new FinsTcpFrameBuilderException(String.format("No command code found for ordinal 0x%04x", commandCodeInt)));
        int errorCodeInt = buf.getInt();
        FinsTcpErrorCode errorCode = (FinsTcpErrorCode)FinsTcpErrorCode.valueOf((int)errorCodeInt).orElseThrow(() -> new FinsTcpFrameBuilderException(String.format("No error code found for ordinal 0x%04x", errorCodeInt)));
        byte[] data = new byte[length - 8];
        buf.get(data);
        FinsTcpFrame finsTcpFrame = new FinsTcpFrameBuilder().setCommandCode(commandCode).setErrorCode(errorCode).setData(data).build();
        return finsTcpFrame;
    }
}

