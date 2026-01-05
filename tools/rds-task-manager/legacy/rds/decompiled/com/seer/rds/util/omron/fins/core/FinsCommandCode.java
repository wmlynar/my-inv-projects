/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 */
package com.seer.rds.util.omron.fins.core;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/*
 * Exception performing whole class analysis ignored.
 */
public enum FinsCommandCode {
    MEMORY_AREA_READ(257),
    MEMORY_AREA_WRITE(258),
    MEMORY_AREA_FILL(259),
    MULTIPLE_MEMORY_AREA_READ(260),
    MEMORY_AREA_TRANSFER(261),
    PARAMETER_AREA_READ(513),
    PARAMETER_AREA_WRITE(514),
    PARAMETER_AREA_CLEAR(515),
    PROGRAM_AREA_READ(769),
    PROGRAM_AREA_WRITE(770),
    PROGRAM_AREA_CLEAR(771),
    RUN(1025),
    STOP(1026),
    CPU_UNIT_DATA_READ(1281),
    CONNECTION_DATA_READ(1282),
    CPU_UNIT_STATUS_READ(1537),
    CYCLE_TIME_READ(1568);

    private final short commandCodeValue;
    private static final Map<Short, FinsCommandCode> map;

    private FinsCommandCode(short commandCodeValue) {
        this.commandCodeValue = commandCodeValue;
    }

    private FinsCommandCode(int commandCodeValue) {
        this(string, n, (short)commandCodeValue);
    }

    public static Optional<FinsCommandCode> valueOf(short commandCodeValue) {
        return Optional.ofNullable((FinsCommandCode)map.get(commandCodeValue));
    }

    public static Optional<FinsCommandCode> valueOf(int commandCodeValue) {
        return FinsCommandCode.valueOf((short)((short)commandCodeValue));
    }

    public short getValue() {
        return this.commandCodeValue;
    }

    static {
        map = Arrays.stream(FinsCommandCode.values()).collect(Collectors.toMap(commandCodeValue -> commandCodeValue.commandCodeValue, commandCodeValue -> commandCodeValue));
    }
}

