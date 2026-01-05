/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsIoMemoryArea
 */
package com.seer.rds.util.omron.fins.core;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/*
 * Exception performing whole class analysis ignored.
 */
public enum FinsIoMemoryArea {
    CIO_BIT(48, 1),
    WR_BIT(49, 1),
    HR_BIT(50, 1),
    AR_BIT(51, 1),
    CIO_WORD(176, 2),
    WR_WORD(177, 2),
    HR_WORD(178, 2),
    AR_WORD(179, 2),
    TIMER_COUNTER_COMPLETION_FLAG(9, 1),
    TIMER_COUNTER_PV(137, 2),
    DM_BIT(2, 1),
    DM_WORD(130, 2),
    TASK_BIT(6, 1),
    TASK_STATUS(70, 1),
    INDEX_REGISTER_PV(220, 4),
    DATA_REGISTER_PV(188, 2),
    CLOCK_PULSES_CONDITION_FLAGS_BIT(7, 1);

    private final byte memoryAreaValue;
    private final int dataByteSize;
    private static final Map<Byte, FinsIoMemoryArea> map;

    private FinsIoMemoryArea(int memoryAreaValue, int dataByteSize) {
        this.memoryAreaValue = (byte)memoryAreaValue;
        this.dataByteSize = dataByteSize;
    }

    public static Optional<FinsIoMemoryArea> valueOf(byte memoryAreaValue) {
        return Optional.ofNullable((FinsIoMemoryArea)map.get(memoryAreaValue));
    }

    public byte getValue() {
        return this.memoryAreaValue;
    }

    public int getDataByteSize() {
        return this.dataByteSize;
    }

    static {
        map = Arrays.stream(FinsIoMemoryArea.values()).collect(Collectors.toMap(memoryAreaValue -> memoryAreaValue.memoryAreaValue, memoryAreaValue -> memoryAreaValue));
    }
}

