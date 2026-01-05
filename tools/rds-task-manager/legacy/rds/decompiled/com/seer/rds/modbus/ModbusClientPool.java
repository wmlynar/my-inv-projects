/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.modbus.ModbusClient
 *  com.seer.rds.modbus.ModbusClientPool
 */
package com.seer.rds.modbus;

import com.seer.rds.modbus.ModbusClient;
import java.util.concurrent.ConcurrentHashMap;

public class ModbusClientPool {
    private static ConcurrentHashMap<String, ModbusClient> modbusClients = new ConcurrentHashMap();

    public static ModbusClient getModbusClient(String host, Integer port) {
        String key = host + ":" + port;
        ModbusClient c = (ModbusClient)modbusClients.get(key);
        if (c == null) {
            c = new ModbusClient(host, port);
            c.init();
            modbusClients.put(key, c);
        }
        return c;
    }
}

