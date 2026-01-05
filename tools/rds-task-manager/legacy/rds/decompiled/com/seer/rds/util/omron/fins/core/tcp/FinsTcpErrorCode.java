/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpErrorCode
 */
package com.seer.rds.util.omron.fins.core.tcp;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/*
 * Exception performing whole class analysis ignored.
 */
public enum FinsTcpErrorCode {
    NORMAL(0),
    HEADER_NOT_FINS(1),
    DATA_LENGTH_TOO_LONG(2),
    COMMAND_NOT_SUPPORTED(3),
    ALL_CONNECTIONS_ARE_IN_USE(32),
    SPECIFIED_NODE_IS_ALREADY_CONNECTED(33),
    ATTEMPTED_PROTECTED_CONNECTION_FROM_UNSPECIFIED_IP_ADDRESS(34),
    FINS_NODE_OUT_OF_RANGE(35),
    FINS_NODE_SERVER_CLIENT_SAME(36),
    FINS_NODE_ADDRESSES_AVAILABLE_EXHAUSTED(37);

    int errorCodeValue;
    private static final Map<Integer, FinsTcpErrorCode> map;

    private FinsTcpErrorCode(int errorCodeValue) {
        this.errorCodeValue = errorCodeValue;
    }

    public static Optional<FinsTcpErrorCode> valueOf(int errorCodeValue) {
        return Optional.ofNullable((FinsTcpErrorCode)map.get(errorCodeValue));
    }

    public int getValue() {
        return this.errorCodeValue;
    }

    static {
        map = Arrays.stream(FinsTcpErrorCode.values()).collect(Collectors.toMap(errorCode -> errorCode.errorCodeValue, errorCode -> errorCode));
    }
}

