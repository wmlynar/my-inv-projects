/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  MitsubishiMC.Core.Types.OperateResult
 *  MitsubishiMC.Core.Types.OperateResultExOne
 *  MitsubishiMC.Profinet.Siemens.SiemensPLCS
 *  MitsubishiMC.Profinet.Siemens.SiemensS7Net
 *  com.seer.rds.util.siemens.S7Util
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.siemens;

import MitsubishiMC.Core.Types.OperateResult;
import MitsubishiMC.Core.Types.OperateResultExOne;
import MitsubishiMC.Profinet.Siemens.SiemensPLCS;
import MitsubishiMC.Profinet.Siemens.SiemensS7Net;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class S7Util {
    private static final Logger log = LoggerFactory.getLogger(S7Util.class);
    private static final ConcurrentHashMap<String, SiemensS7Net> clients = new ConcurrentHashMap();

    public static SiemensS7Net getClient(String type, String ip, String slot, String rack) {
        String key = ip + "-" + (StringUtils.isEmpty((CharSequence)slot) ? "0" : slot) + "-" + (StringUtils.isEmpty((CharSequence)rack) ? "0" : rack);
        SiemensS7Net client = (SiemensS7Net)clients.get(key);
        if (client == null) {
            client = new SiemensS7Net(SiemensPLCS.valueOf((String)type), ip);
            if (StringUtils.isNotEmpty((CharSequence)slot)) {
                client.setSlot(Byte.parseByte(slot));
            }
            if (StringUtils.isNotEmpty((CharSequence)rack)) {
                client.setRack(Byte.parseByte(rack));
            }
            OperateResult connect = client.ConnectServer();
            if (!connect.IsSuccess) {
                log.error("connect to " + ip + "failed:" + connect.Message);
                return null;
            }
            clients.put(key, client);
        }
        return client;
    }

    public static Short readInt(String type, String ip, String blockAndOffset, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResultExOne read = Objects.requireNonNull(client).ReadInt16(blockAndOffset);
        if (!read.IsSuccess) {
            log.error("read " + ip + "failed:" + read.Message);
            return null;
        }
        return (Short)read.Content;
    }

    public static Integer readDInt(String type, String ip, String blockAndOffset, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResultExOne read = Objects.requireNonNull(client).ReadInt32(blockAndOffset);
        if (!read.IsSuccess) {
            log.error("read " + ip + "failed:" + read.Message);
            return null;
        }
        return (Integer)read.Content;
    }

    public static Integer readWord(String type, String ip, String blockAndOffset, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResultExOne read = Objects.requireNonNull(client).ReadInt32(blockAndOffset);
        if (!read.IsSuccess) {
            log.error("read " + ip + "failed:" + read.Message);
            return null;
        }
        return (Integer)read.Content;
    }

    public static Long readDWord(String type, String ip, String blockAndOffset, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResultExOne read = Objects.requireNonNull(client).ReadInt64(blockAndOffset);
        if (!read.IsSuccess) {
            log.error("read " + ip + "failed:" + read.Message);
            return null;
        }
        return (Long)read.Content;
    }

    public static String readString(String type, String ip, String blockAndOffset, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResultExOne read = Objects.requireNonNull(client).ReadString(blockAndOffset);
        if (!read.IsSuccess) {
            log.error("read " + ip + "failed:" + read.Message);
            return null;
        }
        return (String)read.Content;
    }

    public static Boolean readBoolean(String type, String ip, String blockAndOffset, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResultExOne read = Objects.requireNonNull(client).ReadBool(blockAndOffset);
        if (!read.IsSuccess) {
            log.error("read " + ip + "failed:" + read.Message);
            return null;
        }
        return (Boolean)read.Content;
    }

    public static Boolean writeInt(String type, String ip, String blockAndOffset, int value, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResult write = Objects.requireNonNull(client).Write(blockAndOffset, (short)value);
        if (!write.IsSuccess) {
            log.error("write " + ip + "failed:" + write.Message);
        }
        return write.IsSuccess;
    }

    public static Boolean writeDInt(String type, String ip, String blockAndOffset, int value, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResult write = Objects.requireNonNull(client).Write(blockAndOffset, value);
        if (!write.IsSuccess) {
            log.error("write " + ip + "failed:" + write.Message);
        }
        return write.IsSuccess;
    }

    public static Boolean writeWord(String type, String ip, String blockAndOffset, int value, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResult write = Objects.requireNonNull(client).Write(blockAndOffset, value);
        if (!write.IsSuccess) {
            log.error("write " + ip + "failed:" + write.Message);
        }
        return write.IsSuccess;
    }

    public static Boolean writeDWord(String type, String ip, String blockAndOffset, Long value, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResult write = Objects.requireNonNull(client).Write(blockAndOffset, value.longValue());
        if (!write.IsSuccess) {
            log.error("write " + ip + "failed:" + write.Message);
        }
        return write.IsSuccess;
    }

    public static Boolean writeString(String type, String ip, String blockAndOffset, String value, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResult write = Objects.requireNonNull(client).Write(blockAndOffset, value);
        if (!write.IsSuccess) {
            log.error("write " + ip + "failed:" + write.Message);
        }
        return write.IsSuccess;
    }

    public static Boolean writeBoolean(String type, String ip, String blockAndOffset, boolean value, String slot, String rack) {
        SiemensS7Net client = S7Util.getClient((String)type, (String)ip, (String)slot, (String)rack);
        OperateResult write = Objects.requireNonNull(client).Write(blockAndOffset, value);
        if (!write.IsSuccess) {
            log.error("write " + ip + "failed:" + write.Message);
        }
        return write.IsSuccess;
    }

    public static Object parseValueToDataType(Object value, String dataType) {
        switch (dataType) {
            case "Int": {
                value = Short.valueOf(value.toString());
                break;
            }
            case "DInt": {
                value = Integer.valueOf(value.toString());
                break;
            }
            case "Word": {
                value = Integer.valueOf(value.toString());
                break;
            }
            case "DWord": {
                value = Long.valueOf(value.toString());
                break;
            }
            case "String": {
                value = value.toString();
                break;
            }
            case "Bool": {
                value = Boolean.valueOf(value.toString());
                break;
            }
            default: {
                throw new RuntimeException("@{wind.bp.unsupportedDataType}");
            }
        }
        return value;
    }

    public static boolean S7write(String type, String ip, String blockAndOffset, String dataType, Object value, String slot, String rack) {
        boolean success;
        switch (dataType) {
            case "Int": {
                success = S7Util.writeInt((String)type, (String)ip, (String)blockAndOffset, (int)Integer.parseInt(value.toString()), (String)slot, (String)rack);
                break;
            }
            case "DInt": {
                success = S7Util.writeDInt((String)type, (String)ip, (String)blockAndOffset, (int)Integer.parseInt(value.toString()), (String)slot, (String)rack);
                break;
            }
            case "Word": {
                success = S7Util.writeWord((String)type, (String)ip, (String)blockAndOffset, (int)Integer.parseInt(value.toString()), (String)slot, (String)rack);
                break;
            }
            case "DWord": {
                success = S7Util.writeDWord((String)type, (String)ip, (String)blockAndOffset, (Long)Long.parseLong(value.toString()), (String)slot, (String)rack);
                break;
            }
            case "String": {
                success = S7Util.writeString((String)type, (String)ip, (String)blockAndOffset, (String)value.toString(), (String)slot, (String)rack);
                break;
            }
            case "Bool": {
                success = S7Util.writeBoolean((String)type, (String)ip, (String)blockAndOffset, (boolean)Boolean.parseBoolean(value.toString()), (String)slot, (String)rack);
                break;
            }
            default: {
                throw new RuntimeException("@{wind.bp.unsupportedDataType}");
            }
        }
        return success;
    }

    public static Object S7Read(String type, String ip, String blockAndOffset, String dataType, String slot, String rack) {
        Object value;
        switch (dataType) {
            case "Int": {
                value = S7Util.readInt((String)type, (String)ip, (String)blockAndOffset, (String)slot, (String)rack);
                break;
            }
            case "DInt": {
                value = S7Util.readDInt((String)type, (String)ip, (String)blockAndOffset, (String)slot, (String)rack);
                break;
            }
            case "Word": {
                value = S7Util.readWord((String)type, (String)ip, (String)blockAndOffset, (String)slot, (String)rack);
                break;
            }
            case "DWord": {
                value = S7Util.readDWord((String)type, (String)ip, (String)blockAndOffset, (String)slot, (String)rack);
                break;
            }
            case "String": {
                value = S7Util.readString((String)type, (String)ip, (String)blockAndOffset, (String)slot, (String)rack);
                break;
            }
            case "Bool": {
                value = S7Util.readBoolean((String)type, (String)ip, (String)blockAndOffset, (String)slot, (String)rack);
                break;
            }
            default: {
                throw new RuntimeException("@{wind.bp.unsupportedDataType}");
            }
        }
        return value;
    }
}

