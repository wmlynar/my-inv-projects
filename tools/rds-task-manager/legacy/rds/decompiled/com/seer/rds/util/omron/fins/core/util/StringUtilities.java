/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.util.StringUtilities
 *  javax.xml.bind.DatatypeConverter
 */
package com.seer.rds.util.omron.fins.core.util;

import javax.xml.bind.DatatypeConverter;

public class StringUtilities {
    public static String getHexString(byte[] bytes) {
        return DatatypeConverter.printHexBinary((byte[])bytes).replaceAll(".{2}(?!$)", "$0 ");
    }
}

