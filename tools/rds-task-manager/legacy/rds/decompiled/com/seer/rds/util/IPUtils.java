/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.IPUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class IPUtils {
    private static final Logger log = LoggerFactory.getLogger(IPUtils.class);

    public static List<String> getAllIp() {
        ArrayList<String> ipList = new ArrayList<String>();
        try {
            Enumeration<NetworkInterface> allNetInterfaces = NetworkInterface.getNetworkInterfaces();
            while (allNetInterfaces.hasMoreElements()) {
                NetworkInterface netInterface = allNetInterfaces.nextElement();
                Enumeration<InetAddress> addresses = netInterface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress ip = addresses.nextElement();
                    if (!(ip instanceof Inet4Address) || ip.isLoopbackAddress() || ip.getHostAddress().contains(":")) continue;
                    ipList.add(ip.getHostAddress());
                }
            }
        }
        catch (SocketException e) {
            log.error("IP Socket Exception", (Throwable)e);
        }
        return ipList;
    }
}

