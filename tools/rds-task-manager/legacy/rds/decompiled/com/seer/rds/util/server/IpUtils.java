/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.server.IpUtils
 *  javax.servlet.http.HttpServletRequest
 *  org.apache.commons.lang3.StringUtils
 */
package com.seer.rds.util.server;

import java.net.InetAddress;
import java.net.UnknownHostException;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;

/*
 * Exception performing whole class analysis ignored.
 */
public class IpUtils {
    public static String getIpAddr(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String ip = request.getHeader("x-forwarded-for");
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Forwarded-For");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return "0:0:0:0:0:0:0:1".equals(ip) ? "127.0.0.1" : IpUtils.getMultistageReverseProxyIp((String)ip);
    }

    public static boolean internalIp(String ip) {
        byte[] addr = IpUtils.textToNumericFormatV4((String)ip);
        return IpUtils.internalIp((byte[])addr) || "127.0.0.1".equals(ip);
    }

    public static boolean isNull(Object object) {
        return object == null;
    }

    private static boolean internalIp(byte[] addr) {
        if (IpUtils.isNull((Object)addr) || addr.length < 2) {
            return true;
        }
        byte b0 = addr[0];
        byte b1 = addr[1];
        int SECTION_1 = 10;
        int SECTION_2 = -84;
        int SECTION_3 = 16;
        int SECTION_4 = 31;
        int SECTION_5 = -64;
        int SECTION_6 = -88;
        switch (b0) {
            case 10: {
                return true;
            }
            case -84: {
                if (b1 >= 16 && b1 <= 31) {
                    return true;
                }
            }
            case -64: {
                switch (b1) {
                    case -88: {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public static byte[] textToNumericFormatV4(String text) {
        if (text.length() == 0) {
            return null;
        }
        byte[] bytes = new byte[4];
        String[] elements = text.split("\\.", -1);
        try {
            switch (elements.length) {
                case 1: {
                    long l = Long.parseLong(elements[0]);
                    if (l < 0L || l > 0xFFFFFFFFL) {
                        return null;
                    }
                    bytes[0] = (byte)(l >> 24 & 0xFFL);
                    bytes[1] = (byte)((l & 0xFFFFFFL) >> 16 & 0xFFL);
                    bytes[2] = (byte)((l & 0xFFFFL) >> 8 & 0xFFL);
                    bytes[3] = (byte)(l & 0xFFL);
                    break;
                }
                case 2: {
                    long l = Integer.parseInt(elements[0]);
                    if (l < 0L || l > 255L) {
                        return null;
                    }
                    bytes[0] = (byte)(l & 0xFFL);
                    l = Integer.parseInt(elements[1]);
                    if (l < 0L || l > 0xFFFFFFL) {
                        return null;
                    }
                    bytes[1] = (byte)(l >> 16 & 0xFFL);
                    bytes[2] = (byte)((l & 0xFFFFL) >> 8 & 0xFFL);
                    bytes[3] = (byte)(l & 0xFFL);
                    break;
                }
                case 3: {
                    long l;
                    for (int i = 0; i < 2; ++i) {
                        l = Integer.parseInt(elements[i]);
                        if (l < 0L || l > 255L) {
                            return null;
                        }
                        bytes[i] = (byte)(l & 0xFFL);
                    }
                    l = Integer.parseInt(elements[2]);
                    if (l < 0L || l > 65535L) {
                        return null;
                    }
                    bytes[2] = (byte)(l >> 8 & 0xFFL);
                    bytes[3] = (byte)(l & 0xFFL);
                    break;
                }
                case 4: {
                    for (int i = 0; i < 4; ++i) {
                        long l = Integer.parseInt(elements[i]);
                        if (l < 0L || l > 255L) {
                            return null;
                        }
                        bytes[i] = (byte)(l & 0xFFL);
                    }
                    break;
                }
                default: {
                    return null;
                }
            }
        }
        catch (NumberFormatException e) {
            return null;
        }
        return bytes;
    }

    public static String getHostIp() {
        try {
            return InetAddress.getLocalHost().getHostAddress();
        }
        catch (UnknownHostException unknownHostException) {
            return "127.0.0.1";
        }
    }

    public static String getHostName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        }
        catch (UnknownHostException unknownHostException) {
            return "\u672a\u77e5";
        }
    }

    public static String getMultistageReverseProxyIp(String ip) {
        if (ip != null && ip.indexOf(",") > 0) {
            String[] ips;
            for (String subIp : ips = ip.trim().split(",")) {
                if (IpUtils.isUnknown((String)subIp)) continue;
                ip = subIp;
                break;
            }
        }
        return ip;
    }

    public static boolean isUnknown(String checkString) {
        return StringUtils.isBlank((CharSequence)checkString) || "unknown".equalsIgnoreCase(checkString);
    }
}

