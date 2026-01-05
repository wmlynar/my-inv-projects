/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.MD5Utils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class MD5Utils {
    private static final Logger log = LoggerFactory.getLogger(MD5Utils.class);
    static final char[] hexDigits = new char[]{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'};
    static final char[] hexDigitsLower = new char[]{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};

    public static void main(String[] args) {
        System.out.println(MD5Utils.MD5Lower((String)"123456"));
    }

    public static String MD5Lower(String plainText) {
        MessageDigest md5 = null;
        try {
            md5 = MessageDigest.getInstance("MD5");
        }
        catch (Exception e) {
            log.error("Md5 Exception", (Throwable)e);
            return "";
        }
        char[] charArray = plainText.toCharArray();
        byte[] byteArray = new byte[charArray.length];
        for (int i = 0; i < charArray.length; ++i) {
            byteArray[i] = (byte)charArray[i];
        }
        byte[] md5Bytes = md5.digest(byteArray);
        StringBuffer hexValue = new StringBuffer();
        for (int i = 0; i < md5Bytes.length; ++i) {
            int val = md5Bytes[i] & 0xFF;
            if (val < 16) {
                hexValue.append("0");
            }
            hexValue.append(Integer.toHexString(val));
        }
        return hexValue.toString();
    }

    public static String MD5Upper(String plainText) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(plainText.getBytes());
            byte[] mdResult = md.digest();
            int j = mdResult.length;
            char[] str = new char[j * 2];
            int k = 0;
            for (int i = 0; i < j; ++i) {
                byte byte0 = mdResult[i];
                str[k++] = hexDigits[byte0 >>> 4 & 0xF];
                str[k++] = hexDigits[byte0 & 0xF];
            }
            return new String(str);
        }
        catch (Exception e) {
            log.error("Md5 Upper Exception", (Throwable)e);
            return null;
        }
    }

    public static String MD5Lower(String plainText, String saltValue) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(plainText.getBytes());
            md.update(saltValue.getBytes());
            return new BigInteger(1, md.digest()).toString(16);
        }
        catch (NoSuchAlgorithmException e) {
            log.error("MD5Lower Exception", (Throwable)e);
            return null;
        }
    }

    public static String MD5Upper(String plainText, String saltValue) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(plainText.getBytes());
            md.update(saltValue.getBytes());
            byte[] mdResult = md.digest();
            int j = mdResult.length;
            char[] str = new char[j * 2];
            int k = 0;
            for (int i = 0; i < j; ++i) {
                byte byte0 = mdResult[i];
                str[k++] = hexDigits[byte0 >>> 4 & 0xF];
                str[k++] = hexDigits[byte0 & 0xF];
            }
            return new String(str);
        }
        catch (Exception e) {
            log.error("MD5Upper Exception", (Throwable)e);
            return null;
        }
    }

    public static final String MD5(String plainText) {
        MessageDigest md5 = null;
        try {
            md5 = MessageDigest.getInstance("MD5");
        }
        catch (Exception e) {
            log.error("MD5 Exception", (Throwable)e);
            return "";
        }
        char[] charArray = plainText.toCharArray();
        byte[] byteArray = new byte[charArray.length];
        for (int i = 0; i < charArray.length; ++i) {
            byteArray[i] = (byte)charArray[i];
        }
        byte[] md5Bytes = md5.digest(byteArray);
        StringBuffer hexValue = new StringBuffer();
        for (int i = 0; i < md5Bytes.length; ++i) {
            int val = md5Bytes[i] & 0xFF;
            if (val < 16) {
                hexValue.append("0");
            }
            hexValue.append(Integer.toHexString(val));
        }
        return hexValue.toString();
    }

    public static boolean valid(String text, String md5) {
        return md5.equals(MD5Utils.MD5((String)text)) || md5.equals(MD5Utils.MD5((String)text).toUpperCase());
    }
}

