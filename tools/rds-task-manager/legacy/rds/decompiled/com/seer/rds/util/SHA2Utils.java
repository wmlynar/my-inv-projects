/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.SHA2Utils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class SHA2Utils {
    private static final Logger log = LoggerFactory.getLogger(SHA2Utils.class);
    static final char[] hexDigits = new char[]{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'};
    static final char[] hexDigitsLower = new char[]{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};

    public static void main(String[] args) {
        System.out.println(SHA2Utils.SHA256Lower((String)"rds123", (String)"Rds123!"));
    }

    public static String SHA256Lower(String plainText) {
        return SHA2Utils.encrypt((String)plainText, (String)"SHA-256", (boolean)true);
    }

    public static String SHA256Upper(String plainText) {
        return SHA2Utils.encrypt((String)plainText, (String)"SHA-256", (boolean)false);
    }

    public static String SHA512Lower(String plainText) {
        return SHA2Utils.encrypt((String)plainText, (String)"SHA-512", (boolean)true);
    }

    public static String SHA512Upper(String plainText) {
        return SHA2Utils.encrypt((String)plainText, (String)"SHA-512", (boolean)false);
    }

    private static String encrypt(String plainText, String algorithm, boolean lowerCase) {
        try {
            MessageDigest md = MessageDigest.getInstance(algorithm);
            md.update(plainText.getBytes());
            byte[] digest = md.digest();
            char[] hexArray = lowerCase ? hexDigitsLower : hexDigits;
            char[] result = new char[digest.length * 2];
            int k = 0;
            for (byte b : digest) {
                result[k++] = hexArray[b >>> 4 & 0xF];
                result[k++] = hexArray[b & 0xF];
            }
            return new String(result);
        }
        catch (NoSuchAlgorithmException e) {
            log.error(algorithm + " Encryption Exception", (Throwable)e);
            return null;
        }
    }

    public static String SHA256Lower(String plainText, String saltValue) {
        return SHA2Utils.encryptWithSalt((String)plainText, (String)saltValue, (String)"SHA-256", (boolean)true);
    }

    public static String SHA512Upper(String plainText, String saltValue) {
        return SHA2Utils.encryptWithSalt((String)plainText, (String)saltValue, (String)"SHA-512", (boolean)false);
    }

    private static String encryptWithSalt(String plainText, String saltValue, String algorithm, boolean lowerCase) {
        try {
            MessageDigest md = MessageDigest.getInstance(algorithm);
            md.update(plainText.getBytes());
            md.update(saltValue.getBytes());
            byte[] digest = md.digest();
            char[] hexArray = lowerCase ? hexDigitsLower : hexDigits;
            char[] result = new char[digest.length * 2];
            int k = 0;
            for (byte b : digest) {
                result[k++] = hexArray[b >>> 4 & 0xF];
                result[k++] = hexArray[b & 0xF];
            }
            return new String(result);
        }
        catch (NoSuchAlgorithmException e) {
            log.error(algorithm + " Encryption With Salt Exception", (Throwable)e);
            return null;
        }
    }
}

