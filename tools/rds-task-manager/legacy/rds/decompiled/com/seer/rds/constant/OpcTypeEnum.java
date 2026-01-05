/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.OpcTypeEnum
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UShort
 */
package com.seer.rds.constant;

import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UShort;

public enum OpcTypeEnum {
    STRING_TYPE(Integer.valueOf(0), "String"),
    BOOLEAN_TYPE(Integer.valueOf(1), "Boolean"),
    WORD_TYPE(Integer.valueOf(2), "Word"),
    SHORT_TYPE(Integer.valueOf(3), "Short"),
    LONG_TYPE(Integer.valueOf(4), "Long"),
    DWORD_TYPE(Integer.valueOf(5), "DWord"),
    FLOAT_TYPE(Integer.valueOf(6), "Float"),
    DOUBLE_TYPE(Integer.valueOf(7), "Double");

    private Integer status;
    private String desc;

    public static Object matchValue(String value, Integer type) throws IllegalArgumentException {
        if (STRING_TYPE.getStatus().equals(type)) {
            return value;
        }
        if (BOOLEAN_TYPE.getStatus().equals(type)) {
            return value.equals("1") || value.equals("true");
        }
        if (WORD_TYPE.getStatus().equals(type)) {
            return UShort.valueOf((String)value);
        }
        if (DWORD_TYPE.getStatus().equals(type)) {
            return UInteger.valueOf((String)value);
        }
        if (LONG_TYPE.getStatus().equals(type)) {
            return Integer.valueOf(value);
        }
        if (SHORT_TYPE.getStatus().equals(type)) {
            return Short.valueOf(value);
        }
        if (FLOAT_TYPE.getStatus().equals(type)) {
            return Float.valueOf(value);
        }
        if (DOUBLE_TYPE.getStatus().equals(type)) {
            return Double.valueOf(value);
        }
        return value;
    }

    private OpcTypeEnum(Integer status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private OpcTypeEnum() {
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

