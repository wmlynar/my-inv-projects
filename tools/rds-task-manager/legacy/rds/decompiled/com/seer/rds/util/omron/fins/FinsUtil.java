/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.IPUtils
 *  com.seer.rds.util.omron.fins.FinsUtil
 *  com.seer.rds.util.omron.fins.core.Bit
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.FinsIoMemoryArea
 *  com.seer.rds.util.omron.fins.core.FinsMasterException
 *  com.seer.rds.util.omron.fins.core.FinsNodeAddress
 *  com.seer.rds.util.omron.fins.udp.master.FinsNettyUdpMaster
 */
package com.seer.rds.util.omron.fins;

import com.seer.rds.util.IPUtils;
import com.seer.rds.util.omron.fins.core.Bit;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.FinsIoMemoryArea;
import com.seer.rds.util.omron.fins.core.FinsMasterException;
import com.seer.rds.util.omron.fins.core.FinsNodeAddress;
import com.seer.rds.util.omron.fins.udp.master.FinsNettyUdpMaster;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/*
 * Exception performing whole class analysis ignored.
 */
public class FinsUtil {
    private static final ConcurrentHashMap<String, FinsNettyUdpMaster> finsMasters = new ConcurrentHashMap();

    public static FinsNettyUdpMaster getMaster(String ip, int port) throws FinsMasterException {
        String key = ip + ":" + port;
        InetSocketAddress destAddr = new InetSocketAddress(ip, port);
        String sourceIp = (String)IPUtils.getAllIp().get(0);
        int node = FinsUtil.getLastSegOfIp((String)sourceIp);
        FinsNodeAddress srcNode = new FinsNodeAddress(0, node, 0);
        FinsNettyUdpMaster finsUdpMaster = (FinsNettyUdpMaster)finsMasters.get(key);
        if (finsUdpMaster == null) {
            finsUdpMaster = new FinsNettyUdpMaster(destAddr, srcNode);
            finsUdpMaster.connect();
            finsMasters.put(key, finsUdpMaster);
        }
        return finsUdpMaster;
    }

    public static String readString(String ip, int port, int area, int finsIoAddr, int bitOffset, int wordLength) throws FinsMasterException {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).readString(destNode, finsIoAddress, (short)wordLength);
    }

    public static short readWord(String ip, int port, int area, int finsIoAddr, int bitOffset) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).readWord(destNode, finsIoAddress);
    }

    public static List<Short> readWords(String ip, int port, int area, int finsIoAddr, int bitOffset, int itemCount) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).readWords(destNode, finsIoAddress, (short)itemCount);
    }

    public static Bit readBit(String ip, int port, int area, int finsIoAddr, int bitOffset) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).readBit(destNode, finsIoAddress);
    }

    public static List<Bit> readBits(String ip, int port, int area, int finsIoAddr, int bitOffset, int itemCount) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).readBits(destNode, finsIoAddress, (short)itemCount);
    }

    public static Boolean writeWord(String ip, int port, int area, int finsIoAddr, int bitOffset, int value) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).writeWord(destNode, finsIoAddress, Short.valueOf((short)value));
    }

    public static Boolean writeWords(String ip, int port, int area, int finsIoAddr, int bitOffset, List<Short> values) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).writeWords(destNode, finsIoAddress, values);
    }

    public static Boolean writeBit(String ip, int port, int area, int finsIoAddr, int bitOffset, boolean value) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).writeBit(destNode, finsIoAddress, Boolean.valueOf(value));
    }

    public static Boolean writeBits(String ip, int port, int area, int finsIoAddr, int bitOffset, List<Boolean> values) throws Exception {
        int node = FinsUtil.getLastSegOfIp((String)ip);
        FinsNodeAddress destNode = new FinsNodeAddress(0, node, 0);
        FinsIoMemoryArea memoryArea = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)((byte)area)).get();
        FinsIoAddress finsIoAddress = new FinsIoAddress(memoryArea, finsIoAddr, bitOffset);
        return FinsUtil.getMaster((String)ip, (int)port).writeBits(destNode, finsIoAddress, values);
    }

    public static void disconnected(String ip, int port) throws FinsMasterException {
        FinsUtil.getMaster((String)ip, (int)port).close();
        String key = ip + ":" + port;
        finsMasters.remove(key);
    }

    public static int getLastSegOfIp(String ip) {
        return Integer.parseInt(ip.substring(ip.lastIndexOf(".") + 1));
    }

    public static Object parseValueToDataType(Object value, String dataType) {
        switch (dataType) {
            case "Word": {
                value = Short.valueOf(value.toString());
                break;
            }
            case "Bit": {
                value = new Bit(Integer.valueOf(value.toString()).byteValue()).getBitData();
                break;
            }
            default: {
                throw new RuntimeException("@{wind.bp.unsupportedDataType}");
            }
        }
        return value;
    }

    public static void main(String[] args) throws Exception {
        try {
            short s = FinsUtil.readWord((String)"127.0.0.1", (int)9601, (int)130, (int)3000, (int)0);
            System.out.println("s=" + s);
        }
        finally {
            FinsUtil.disconnected((String)"127.0.0.1", (int)9601);
        }
    }
}

