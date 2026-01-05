/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 */
package com.seer.rds.util.omron.fins.core;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/*
 * Exception performing whole class analysis ignored.
 */
public enum FinsEndCode {
    NORMAL_COMPLETION(0),
    LOCAL_NODE_NOT_IN_NETWORK(257),
    TOKEN_TIMEOUT(258),
    RETRIES_FAILED(259),
    TOO_MANY_SEND_FRAMES(260),
    NODE_ADDRESS_RANGE_ERROR(261),
    NODE_ADDRESS_RANGE_DUPLICATION(262),
    DESTINATION_NODE_NOT_IN_NETWORK(513),
    UNIT_MISSING(514),
    THIRD_NODE_MISSING(515),
    DESTINATION_NODE_BUSY(516),
    RESPONSE_TIMEOUT(517),
    COMMUNICATIONS_CONTROLLER_ERROR(769),
    CPU_UNIT_ERROR(770),
    CONTROLLER_ERROR(771),
    UNIT_NUMBER_ERROR(772),
    UNDEFINED_COMMAND(1025),
    NOT_SUPPORTED_BY_MODEL_VERSION(1026),
    DESTINATION_ADDRESS_SETTING_ERROR(1281),
    NO_ROUTING_TABLES(1282),
    ROUTING_TABLE_ERROR(1283),
    TOO_MANY_RELAYS(1284),
    COMMAND_TOO_LONG(4097),
    COMMAND_TOO_SHORT(4098),
    ELEMENTS_DATA_DONT_MATCH(4099),
    COMMAND_FORMAT_ERROR(4100),
    HEADER_ERROR(4101),
    AREA_CLASSIFICATION_MISSING(4353),
    ACCESS_SIZE_ERROR(4354),
    ADDRESS_RANGE_ERROR(4355),
    ADDRESS_RANGE_EXCEEDED(4356),
    PROGRAM_MISSING(4358),
    RELATIONAL_ERROR(4361),
    DUPLICATE_DATA_ACCESS(4362),
    RESPONSE_TOO_BIG(4363),
    PARAMETER_ERROR(4364),
    WRITE_NOT_POSSIBLE__READ_ONLY(8449),
    WRITE_NOT_POSSIBLE__PROTECTED(8450),
    WRITE_NOT_POSSIBLE__CANNOT_REGISTER(8451),
    WRITE_NOT_POSSIBLE__PROGRAM_MISSING(8453),
    WRITE_NOT_POSSIBLE__FILE_MISSING(8454),
    WRITE_NOT_POSSIBLE__FILE_NAME_ALREADY_EXISTS(8455),
    WRITE_NOT_POSSIBLE__CANNOT_CHANGE(8456),
    NOT_EXECUTABLE_IN_CURRENT_MODE__NOT_POSSIBLE_DURING_EXECUTION(8705),
    NOT_EXECUTABLE_IN_CURRENT_MODE__NOT_POSSIBLE_WHILE_RUNNING(8706),
    NOT_EXECUTABLE_IN_CURRENT_MODE__WRONG_PLC_MODE__IN_PROGRAM(8707),
    NOT_EXECUTABLE_IN_CURRENT_MODE__WRONG_PLC_MODE__IN_DEBUG(8708),
    NOT_EXECUTABLE_IN_CURRENT_MODE__WRONG_PLC_MODE__IN_MONITOR(8709),
    NOT_EXECUTABLE_IN_CURRENT_MODE__WRONG_PLC_MODE__IN_RUN(8710),
    NOT_EXECUTABLE_IN_CURRENT_MODE__SPECIFIED_NODE_NOT_POLLING_NODE(8711),
    NOT_EXECUTABLE_IN_CURRENT_MODE__STEP_CANNOT_BE_EXECUTED(8712),
    NO_SUCH_DEVICE__FILE_DEVICE_MISSING(8961),
    NO_SUCH_DEVICE__MEMORY_MISSING(8962),
    NO_SUCH_DEVICE__CLOCK_MISSING(8963),
    CANNOT_START_STOP__TABLE_MISSING(9217);

    private final short endCodeValue;
    private static final Map<Short, FinsEndCode> map;

    private FinsEndCode(short endCodeValue) {
        this.endCodeValue = endCodeValue;
    }

    private FinsEndCode(int endCodeValue) {
        this(string, n, (short)endCodeValue);
    }

    public static Optional<FinsEndCode> valueOf(short endCodeValue) {
        int mask = 16191;
        short val = (short)(endCodeValue & mask);
        return Optional.ofNullable((FinsEndCode)map.get(val));
    }

    public static Optional<FinsEndCode> valueOf(int endCodeValue) {
        return FinsEndCode.valueOf((short)((short)endCodeValue));
    }

    public short getValue() {
        return this.endCodeValue;
    }

    static {
        map = Arrays.stream(FinsEndCode.values()).collect(Collectors.toMap(endCode -> endCode.endCodeValue, endCodeValue -> endCodeValue));
    }
}

