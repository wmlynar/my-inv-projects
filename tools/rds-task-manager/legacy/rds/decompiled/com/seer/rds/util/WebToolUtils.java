/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.WebToolUtils
 *  javax.servlet.http.HttpServletRequest
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.Enumeration;
import javax.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class WebToolUtils {
    private static final Logger log = LoggerFactory.getLogger(WebToolUtils.class);

    public static String getLocalIP() throws UnknownHostException, SocketException {
        if (WebToolUtils.isWindowsOS()) {
            return InetAddress.getLocalHost().getHostAddress();
        }
        return WebToolUtils.getLinuxLocalIp();
    }

    public static boolean isWindowsOS() {
        boolean isWindowsOS = false;
        String osName = System.getProperty("os.name");
        if (osName.toLowerCase().indexOf("windows") > -1) {
            isWindowsOS = true;
        }
        return isWindowsOS;
    }

    public static String getLocalHostName() throws UnknownHostException {
        return InetAddress.getLocalHost().getHostName();
    }

    private static String getLinuxLocalIp() throws SocketException {
        String ip = "";
        try {
            Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces();
            while (en.hasMoreElements()) {
                NetworkInterface intf = en.nextElement();
                String name = intf.getName();
                if (name.contains("docker") || name.contains("lo")) continue;
                Enumeration<InetAddress> enumIpAddr = intf.getInetAddresses();
                while (enumIpAddr.hasMoreElements()) {
                    String ipaddress;
                    InetAddress inetAddress = enumIpAddr.nextElement();
                    if (inetAddress.isLoopbackAddress() || (ipaddress = inetAddress.getHostAddress().toString()).contains("::") || ipaddress.contains("0:0:") || ipaddress.contains("fe80")) continue;
                    ip = ipaddress;
                    log.info("getLinuxLocalIp :" + ipaddress);
                }
            }
        }
        catch (SocketException ex) {
            log.error("\u83b7\u53d6ip\u5730\u5740\u5f02\u5e38", (Throwable)ex);
            ip = "127.0.0.1";
        }
        log.info("IP:" + ip);
        return ip;
    }

    public static String getIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("x-forwarded-for");
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}

