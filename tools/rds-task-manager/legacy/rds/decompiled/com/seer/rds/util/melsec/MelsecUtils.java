/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  MitsubishiMC.Core.Types.OperateResult
 *  MitsubishiMC.Core.Types.OperateResultExOne
 *  MitsubishiMC.Profinet.Melsec.MelsecMcNet
 *  com.seer.rds.util.melsec.MelsecUtils
 */
package com.seer.rds.util.melsec;

import MitsubishiMC.Core.Types.OperateResult;
import MitsubishiMC.Core.Types.OperateResultExOne;
import MitsubishiMC.Profinet.Melsec.MelsecMcNet;
import java.util.concurrent.ConcurrentHashMap;

/*
 * Exception performing whole class analysis ignored.
 */
public class MelsecUtils {
    private static final ConcurrentHashMap<String, MelsecMcNet> melsecClients = new ConcurrentHashMap();

    public static MelsecMcNet getMelsecClient(String host, Integer port) throws RuntimeException {
        String key = host + ":" + port;
        MelsecMcNet c = (MelsecMcNet)melsecClients.get(key);
        if (c == null) {
            c = MelsecUtils.getMaster((String)host, (int)port);
            melsecClients.put(key, c);
        }
        return c;
    }

    public static MelsecMcNet getMaster(String ip, int port) throws RuntimeException {
        MelsecMcNet melsecMcNet = new MelsecMcNet(ip, port);
        if (!melsecMcNet.ConnectServer().IsSuccess) {
            throw new RuntimeException("Connection failed: " + melsecMcNet.ConnectServer().ErrorCode + " " + melsecMcNet.ConnectServer().Message);
        }
        return melsecMcNet;
    }

    public static Boolean readBoolean(String ip, int port, String address) throws RuntimeException {
        OperateResultExOne booleanOperateResultExOne = MelsecUtils.getMelsecClient((String)ip, (Integer)port).ReadBool(address);
        if (!booleanOperateResultExOne.IsSuccess) {
            throw new RuntimeException("Read failure: " + booleanOperateResultExOne.ErrorCode + " " + booleanOperateResultExOne.Message);
        }
        return (Boolean)booleanOperateResultExOne.Content;
    }

    public static boolean[] batchReadBoolean(String ip, int port, String address, short length) throws RuntimeException {
        OperateResultExOne booleanOperateResultExOne = MelsecUtils.getMelsecClient((String)ip, (Integer)port).ReadBool(address, length);
        if (!booleanOperateResultExOne.IsSuccess) {
            throw new RuntimeException("Read failure: " + booleanOperateResultExOne.ErrorCode + " " + booleanOperateResultExOne.Message);
        }
        return (boolean[])booleanOperateResultExOne.Content;
    }

    public static Number readNumber(String ip, int port, String address) throws RuntimeException {
        OperateResultExOne resultExOne = MelsecUtils.getMelsecClient((String)ip, (Integer)port).ReadUInt16(address);
        if (!resultExOne.IsSuccess) {
            throw new RuntimeException("Read failure: " + resultExOne.ErrorCode + " " + resultExOne.Message);
        }
        return (Number)resultExOne.Content;
    }

    public static String readString(String ip, int port, String address, short length) throws RuntimeException {
        OperateResultExOne resultExOne = MelsecUtils.getMelsecClient((String)ip, (Integer)port).ReadString(address, length);
        if (!resultExOne.IsSuccess) {
            throw new RuntimeException("Read failure: " + resultExOne.ErrorCode + " " + resultExOne.Message);
        }
        return (String)resultExOne.Content;
    }

    public static boolean writeBoolean(String ip, int port, String address, boolean value) throws RuntimeException {
        OperateResult write = MelsecUtils.getMelsecClient((String)ip, (Integer)port).Write(address, value);
        return write.IsSuccess;
    }

    public static boolean batchWriteBoolean(String ip, int port, String address, boolean[] value) throws RuntimeException {
        OperateResult write = MelsecUtils.getMelsecClient((String)ip, (Integer)port).Write(address, value);
        return write.IsSuccess;
    }

    public static boolean writeNumber(String ip, int port, String address, int value) throws RuntimeException {
        OperateResult write = MelsecUtils.getMelsecClient((String)ip, (Integer)port).Write(address, value);
        if (!write.IsSuccess) {
            throw new RuntimeException("Write failure: " + write.ErrorCode + " " + write.Message);
        }
        return true;
    }

    public static boolean batchWriteNumber(String ip, int port, String address, int[] value) throws RuntimeException {
        OperateResult write = MelsecUtils.getMelsecClient((String)ip, (Integer)port).Write(address, value);
        if (!write.IsSuccess) {
            throw new RuntimeException("Write failure: " + write.ErrorCode + " " + write.Message);
        }
        return true;
    }

    public static boolean writeString(String ip, int port, String address, String value) throws RuntimeException {
        OperateResult write = MelsecUtils.getMelsecClient((String)ip, (Integer)port).Write(address, value);
        return write.IsSuccess;
    }

    public static boolean batchWriteString(String ip, int port, String address, String value, short length) throws RuntimeException {
        OperateResult write = MelsecUtils.getMelsecClient((String)ip, (Integer)port).Write(address, value, (int)length);
        if (!write.IsSuccess) {
            throw new RuntimeException("Write failure: " + write.ErrorCode + " " + write.Message);
        }
        return true;
    }

    public static void main(String[] args) throws Exception {
        System.out.println(MelsecUtils.writeString((String)"169.254.132.38", (int)3333, (String)"D12", (String)"A"));
    }

    public static String stringToAscii(String value) {
        StringBuffer sbu = new StringBuffer();
        char[] chars = value.toCharArray();
        for (int i = 0; i < chars.length; ++i) {
            if (i != chars.length - 1) {
                sbu.append((int)chars[i]).append(",");
                continue;
            }
            sbu.append((int)chars[i]);
        }
        return sbu.toString();
    }
}

