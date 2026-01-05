/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpCommandCode
 */
package com.seer.rds.util.omron.fins.core.tcp;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/*
 * Exception performing whole class analysis ignored.
 */
public enum FinsTcpCommandCode {
    FINS_CLIENT_NODE_ADDRESS_DATA_SEND(0),
    FINS_SERVER_NODE_ADDRESS_DATA_SEND(1),
    FINS_FRAME_SEND(2),
    FINS_FRAME_SEND_ERROR_NOTIFICATION(3),
    CONNECTION_CONFIRMATION(6);

    int commandCodeValue;
    private static final Map<Integer, FinsTcpCommandCode> map;

    private FinsTcpCommandCode(int commandCodeValue) {
        this.commandCodeValue = commandCodeValue;
    }

    public static Optional<FinsTcpCommandCode> valueOf(int commandCodeValue) {
        return Optional.ofNullable((FinsTcpCommandCode)map.get(commandCodeValue));
    }

    public int getValue() {
        return this.commandCodeValue;
    }

    static {
        map = Arrays.stream(FinsTcpCommandCode.values()).collect(Collectors.toMap(commandCode -> commandCode.commandCodeValue, commandCode -> commandCode));
    }
}

