/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.util.ByteBufferUtils
 */
package com.seer.rds.util.omron.fins.core.util;

import java.nio.ByteBuffer;

public class ByteBufferUtils {
    public static short getUnsignedByte(ByteBuffer bb) {
        return (short)(bb.get() & 0xFF);
    }

    public static void putUnsignedByte(ByteBuffer bb, int value) {
        bb.put((byte)(value & 0xFF));
    }

    public static short getUnsignedByte(ByteBuffer bb, int position) {
        return (short)(bb.get(position) & 0xFF);
    }

    public static void putUnsignedByte(ByteBuffer bb, int position, int value) {
        bb.put(position, (byte)(value & 0xFF));
    }

    public static int getUnsignedShort(ByteBuffer bb) {
        return bb.getShort() & 0xFFFF;
    }

    public static void putUnsignedShort(ByteBuffer bb, int value) {
        bb.putShort((short)(value & 0xFFFF));
    }

    public static int getUnsignedShort(ByteBuffer bb, int position) {
        return bb.getShort(position) & 0xFFFF;
    }

    public static void putUnsignedShort(ByteBuffer bb, int position, int value) {
        bb.putShort(position, (short)(value & 0xFFFF));
    }

    public static long getUnsignedInt(ByteBuffer bb) {
        return (long)bb.getInt() & 0xFFFFFFFFL;
    }

    public static void putUnsignedInt(ByteBuffer bb, long value) {
        bb.putInt((int)(value & 0xFFFFFFFFL));
    }

    public static long getUnsignedInt(ByteBuffer bb, int position) {
        return (long)bb.getInt(position) & 0xFFFFFFFFL;
    }

    public static void putUnsignedInt(ByteBuffer bb, int position, long value) {
        bb.putInt(position, (int)(value & 0xFFFFFFFFL));
    }
}

