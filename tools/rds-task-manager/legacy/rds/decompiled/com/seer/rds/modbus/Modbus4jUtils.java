/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.ModbusInstanceMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.modbus.ModbusVoLock
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.ModbusLogUtil
 *  com.seer.rds.util.SpringUtil
 *  com.serotonin.modbus4j.ModbusFactory
 *  com.serotonin.modbus4j.ModbusMaster
 *  com.serotonin.modbus4j.exception.ErrorResponseException
 *  com.serotonin.modbus4j.ip.IpParameters
 *  com.serotonin.modbus4j.locator.BaseLocator
 *  com.serotonin.modbus4j.msg.ModbusRequest
 *  com.serotonin.modbus4j.msg.ModbusResponse
 *  com.serotonin.modbus4j.msg.ReadCoilsRequest
 *  com.serotonin.modbus4j.msg.ReadCoilsResponse
 *  com.serotonin.modbus4j.msg.ReadDiscreteInputsRequest
 *  com.serotonin.modbus4j.msg.ReadDiscreteInputsResponse
 *  com.serotonin.modbus4j.msg.ReadHoldingRegistersRequest
 *  com.serotonin.modbus4j.msg.ReadHoldingRegistersResponse
 *  com.serotonin.modbus4j.msg.ReadInputRegistersRequest
 *  com.serotonin.modbus4j.msg.ReadInputRegistersResponse
 *  com.serotonin.modbus4j.msg.WriteCoilsRequest
 *  com.serotonin.modbus4j.msg.WriteCoilsResponse
 *  com.serotonin.modbus4j.msg.WriteRegistersRequest
 *  com.serotonin.modbus4j.msg.WriteRegistersResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.i18n.LocaleContextHolder
 */
package com.seer.rds.modbus;

import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.ModbusInstanceMapper;
import com.seer.rds.modbus.ModbusVoLock;
import com.seer.rds.model.modbus.ModbusInstance;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.ModbusLogUtil;
import com.seer.rds.util.SpringUtil;
import com.serotonin.modbus4j.ModbusFactory;
import com.serotonin.modbus4j.ModbusMaster;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.ip.IpParameters;
import com.serotonin.modbus4j.locator.BaseLocator;
import com.serotonin.modbus4j.msg.ModbusRequest;
import com.serotonin.modbus4j.msg.ModbusResponse;
import com.serotonin.modbus4j.msg.ReadCoilsRequest;
import com.serotonin.modbus4j.msg.ReadCoilsResponse;
import com.serotonin.modbus4j.msg.ReadDiscreteInputsRequest;
import com.serotonin.modbus4j.msg.ReadDiscreteInputsResponse;
import com.serotonin.modbus4j.msg.ReadHoldingRegistersRequest;
import com.serotonin.modbus4j.msg.ReadHoldingRegistersResponse;
import com.serotonin.modbus4j.msg.ReadInputRegistersRequest;
import com.serotonin.modbus4j.msg.ReadInputRegistersResponse;
import com.serotonin.modbus4j.msg.WriteCoilsRequest;
import com.serotonin.modbus4j.msg.WriteCoilsResponse;
import com.serotonin.modbus4j.msg.WriteRegistersRequest;
import com.serotonin.modbus4j.msg.WriteRegistersResponse;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;

/*
 * Exception performing whole class analysis ignored.
 */
public class Modbus4jUtils {
    private static final Logger log = LoggerFactory.getLogger(Modbus4jUtils.class);
    private static final ConcurrentHashMap<String, ModbusMaster> modbusClients = new ConcurrentHashMap();
    private static final ConcurrentHashMap<String, ModbusInstance> modbusInstances = new ConcurrentHashMap();
    private static final ConcurrentHashMap<String, ModbusVoLock> modbusLocks = new ConcurrentHashMap();
    private static final ModbusFactory modbusFactory = new ModbusFactory();
    private static final ModbusInstanceMapper modbusInstanceMapper = (ModbusInstanceMapper)SpringUtil.getBean(ModbusInstanceMapper.class);

    public static ModbusInstance getInstance(String name) throws Exception {
        LocaleMessageUtil localeMessageUtil = (LocaleMessageUtil)SpringUtil.getBean(LocaleMessageUtil.class);
        if (modbusInstances.get(name) == null) {
            throw new Exception(localeMessageUtil.getMessageMatch("@{modbus.instance.initError}", LocaleContextHolder.getLocale()) + ": " + name);
        }
        return (ModbusInstance)modbusInstances.get(name);
    }

    public static void putInstance(String name, ModbusInstance instance) {
        modbusInstances.put(name, instance);
    }

    public static ModbusInstance removeInstance(String name) {
        return (ModbusInstance)modbusInstances.remove(name);
    }

    public static Map<String, ModbusInstance> listModbusInstances() {
        return modbusInstances;
    }

    public static void removeInstanceById(List<String> ids) {
        Iterator iterator = modbusInstances.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry entry = iterator.next();
            ModbusInstance instance = (ModbusInstance)entry.getValue();
            if (ids.isEmpty() || !ids.contains(instance.getId())) continue;
            iterator.remove();
            String host = instance.getHost();
            Integer port = instance.getPort();
            modbusClients.remove(host + ":" + port);
        }
    }

    public static int socketExceptionHandle(Exception e, int socketExceptionCount, String key) {
        if (e.getMessage().contains("java.net.SocketException")) {
            log.error("socket ex count  {}", (Object)(++socketExceptionCount));
            if (socketExceptionCount == 10) {
                ModbusMaster master = (ModbusMaster)modbusClients.get(key);
                master.destroy();
                modbusClients.remove(key);
                modbusLocks.remove(key);
                return 0;
            }
        }
        return socketExceptionCount;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static ModbusMaster getModbusClient(String host, Integer port) throws Exception {
        String key = host + ":" + port;
        ModbusMaster c = (ModbusMaster)modbusClients.get(key);
        if (c == null) {
            ModbusVoLock modbusVoLock = Modbus4jUtils.getLock((String)host, (Integer)port);
            synchronized (modbusVoLock) {
                c = (ModbusMaster)modbusClients.get(key);
                if (c == null) {
                    log.info("getModbusClient host {}, port {}", (Object)host, (Object)port);
                    c = Modbus4jUtils.getMaster((String)host, (int)port);
                    modbusClients.put(key, c);
                }
            }
        }
        return c;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static ModbusVoLock getLock(String host, Integer port) {
        String key = host + ":" + port;
        ModbusVoLock lock = (ModbusVoLock)modbusLocks.get(key);
        if (lock == null) {
            ConcurrentHashMap concurrentHashMap = modbusClients;
            synchronized (concurrentHashMap) {
                lock = (ModbusVoLock)modbusLocks.get(key);
                if (lock == null) {
                    lock = new ModbusVoLock();
                    lock.setHost(host);
                    lock.setPort(port);
                    modbusLocks.put(key, lock);
                }
            }
        }
        return lock;
    }

    public static ModbusMaster getMaster(String ip, int port) throws Exception {
        IpParameters params = new IpParameters();
        params.setHost(ip);
        params.setPort(port);
        ModbusMaster master = modbusFactory.createTcpMaster(params, true);
        master.setTimeout(PropConfig.getTimeOut().getModbusTimeOut());
        master.init();
        return master;
    }

    public static Boolean readCoilStatus(String ip, int port, int slaveId, int offset, String remark) throws Exception {
        BaseLocator loc = BaseLocator.coilStatus((int)slaveId, (int)offset);
        try {
            Boolean value = (Boolean)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).getValue(loc);
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"0x", (int)offset, (int)1, (String)remark, (String)value.toString());
            return value;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"0x", (int)offset, (int)1, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static Boolean readCoilStatus(String instanceName, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        return Modbus4jUtils.readCoilStatus((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (String)remark);
    }

    public static Boolean readInputStatus(String ip, int port, int slaveId, int offset, String remark) throws Exception {
        BaseLocator loc = BaseLocator.inputStatus((int)slaveId, (int)offset);
        try {
            Boolean value = (Boolean)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).getValue(loc);
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"1x", (int)offset, (int)1, (String)remark, (String)value.toString());
            return value;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"1x", (int)offset, (int)1, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static Boolean readInputStatus(String instanceName, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        return Modbus4jUtils.readInputStatus((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (String)remark);
    }

    public static Number readHoldingRegister(String ip, int port, int slaveId, int offset, int dataType, String remark) throws Exception {
        BaseLocator loc = BaseLocator.holdingRegister((int)slaveId, (int)offset, (int)dataType);
        try {
            Number value = (Number)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).getValue(loc);
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"4x", (int)offset, (int)1, (String)remark, (String)value.toString());
            return value;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"4x", (int)offset, (int)1, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static Number readHoldingRegister(String instanceName, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        return Modbus4jUtils.readHoldingRegister((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)(instance.getTargetType() == null ? 2 : instance.getTargetType()), (String)remark);
    }

    public static Number readInputRegister(String ip, int port, int slaveId, int offset, int dataType, String remark) throws Exception {
        BaseLocator loc = BaseLocator.inputRegister((int)slaveId, (int)offset, (int)dataType);
        try {
            Number value = (Number)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).getValue(loc);
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"3x", (int)offset, (int)1, (String)remark, (String)value.toString());
            return value;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"3x", (int)offset, (int)1, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static Number readInputRegister(String instanceName, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        return Modbus4jUtils.readInputRegister((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)(instance.getTargetType() == null ? 2 : instance.getTargetType()), (String)remark);
    }

    public static void writeCoilStatus(String ip, int port, int slaveId, int offset, Boolean value, String remark) throws Exception {
        BaseLocator loc = BaseLocator.coilStatus((int)slaveId, (int)offset);
        try {
            Modbus4jUtils.getModbusClient((String)ip, (Integer)port).setValue(loc, (Object)value);
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"0x", (int)offset, (int)1, (String)remark, (String)value.toString());
        }
        catch (Exception e) {
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"0x", (int)offset, (int)1, (String)Optional.ofNullable(e.getMessage()).orElse("write error"), null);
            throw e;
        }
    }

    public static void writeCoilStatus(String instanceName, Boolean value, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        Modbus4jUtils.writeCoilStatus((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (Boolean)value, (String)remark);
    }

    public static void writeHoldingRegister(String ip, int port, int slaveId, int offset, int dataType, Object value, String remark) throws Exception {
        BaseLocator loc = BaseLocator.holdingRegister((int)slaveId, (int)offset, (int)dataType);
        try {
            Modbus4jUtils.getModbusClient((String)ip, (Integer)port).setValue(loc, value);
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"4x", (int)offset, (int)1, (String)remark, (String)value.toString());
        }
        catch (Exception e) {
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"4x", (int)offset, (int)1, (String)Optional.ofNullable(e.getMessage()).orElse("write error"), null);
            throw e;
        }
    }

    public static void writeHoldingRegister(String instanceName, Object value, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        Modbus4jUtils.writeHoldingRegister((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)(instance.getTargetType() == null ? 2 : instance.getTargetType()), (Object)value, (String)remark);
    }

    public static boolean[] batchReadCoils(String ip, int port, int slaveId, int start, int len, String remark) throws Exception {
        ReadCoilsRequest request = new ReadCoilsRequest(slaveId, start, len);
        try {
            ReadCoilsResponse response = (ReadCoilsResponse)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).send((ModbusRequest)request);
            if (response.isException()) {
                throw new ErrorResponseException((ModbusRequest)request, (ModbusResponse)response);
            }
            boolean[] values = response.getBooleanData();
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"0x", (int)start, (int)len, (String)remark, (String)Arrays.toString(values));
            return values;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"0x", (int)start, (int)len, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static boolean[] batchReadCoils(String name, int len, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        return Modbus4jUtils.batchReadCoils((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)len, (String)remark);
    }

    public static boolean[] batchReadInput(String ip, int port, int slaveId, int start, int len, String remark) throws Exception {
        ReadDiscreteInputsRequest request = new ReadDiscreteInputsRequest(slaveId, start, len);
        try {
            ReadDiscreteInputsResponse response = (ReadDiscreteInputsResponse)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).send((ModbusRequest)request);
            if (response.isException()) {
                throw new ErrorResponseException((ModbusRequest)request, (ModbusResponse)response);
            }
            boolean[] values = response.getBooleanData();
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"1x", (int)start, (int)len, (String)remark, (String)Arrays.toString(values));
            return values;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"1x", (int)start, (int)len, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static boolean[] batchReadInput(String name, int len, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        return Modbus4jUtils.batchReadInput((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)len, (String)remark);
    }

    public static short[] batchReadHoldingRegisters(String ip, int port, int slaveId, int start, int len, String remark) throws Exception {
        ReadHoldingRegistersRequest request = new ReadHoldingRegistersRequest(slaveId, start, len);
        try {
            ReadHoldingRegistersResponse response = (ReadHoldingRegistersResponse)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).send((ModbusRequest)request);
            if (response.isException()) {
                throw new ErrorResponseException((ModbusRequest)request, (ModbusResponse)response);
            }
            short[] values = response.getShortData();
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"4x", (int)start, (int)len, (String)remark, (String)Arrays.toString(values));
            return values;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"4x", (int)start, (int)len, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static short[] batchReadHoldingRegisters(String name, int len, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        return Modbus4jUtils.batchReadHoldingRegisters((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)len, (String)remark);
    }

    public static short[] batchReadInputRegisters(String ip, int port, int slaveId, int start, int len, String remark) throws Exception {
        ReadInputRegistersRequest request = new ReadInputRegistersRequest(slaveId, start, len);
        try {
            ReadInputRegistersResponse response = (ReadInputRegistersResponse)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).send((ModbusRequest)request);
            if (response.isException()) {
                throw new ErrorResponseException((ModbusRequest)request, (ModbusResponse)response);
            }
            short[] values = response.getShortData();
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"3x", (int)start, (int)len, (String)remark, (String)Arrays.toString(values));
            return values;
        }
        catch (Exception e) {
            ModbusLogUtil.saveReadLogIfChanged((String)ip, (int)port, (int)slaveId, (String)"3x", (int)start, (int)len, (String)Optional.ofNullable(e.getMessage()).orElse("read error"), null);
            throw e;
        }
    }

    public static short[] batchReadInputRegisters(String name, int len, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        return Modbus4jUtils.batchReadInputRegisters((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (int)len, (String)remark);
    }

    public static void batchWriteCoils(String ip, int port, int slaveId, int start, boolean[] values, String remark) throws Exception {
        WriteCoilsRequest request = new WriteCoilsRequest(slaveId, start, values);
        try {
            WriteCoilsResponse response = (WriteCoilsResponse)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).send((ModbusRequest)request);
            if (response.isException()) {
                log.error("Exception response: message=" + response.getExceptionMessage());
                throw new ErrorResponseException((ModbusRequest)request, (ModbusResponse)response);
            }
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"0x", (int)start, (int)values.length, (String)remark, (String)Arrays.toString(values));
        }
        catch (Exception e) {
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"0x", (int)start, (int)values.length, (String)Optional.ofNullable(e.getMessage()).orElse("write error"), null);
            throw e;
        }
    }

    public static void batchWriteCoils(String name, boolean[] values, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        Modbus4jUtils.batchWriteCoils((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (boolean[])values, (String)remark);
    }

    public static void batchWriteRegisters(String ip, int port, int slaveId, int start, short[] values, String remark) throws Exception {
        WriteRegistersRequest request = new WriteRegistersRequest(slaveId, start, values);
        try {
            WriteRegistersResponse response = (WriteRegistersResponse)Modbus4jUtils.getModbusClient((String)ip, (Integer)port).send((ModbusRequest)request);
            if (response.isException()) {
                log.error("Exception response: message=" + response.getExceptionMessage());
                throw new ErrorResponseException((ModbusRequest)request, (ModbusResponse)response);
            }
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"4x", (int)start, (int)values.length, (String)remark, (String)Arrays.toString(values));
        }
        catch (Exception e) {
            ModbusLogUtil.saveWriteLog((String)ip, (int)port, (int)slaveId, (String)"4x", (int)start, (int)values.length, (String)Optional.ofNullable(e.getMessage()).orElse("write error"), null);
            throw e;
        }
    }

    public static void batchWriteRegisters(String name, short[] values, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        Modbus4jUtils.batchWriteRegisters((String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)instance.getTargetAddr(), (short[])values, (String)remark);
    }

    public static Number readSingleValue(String addrType, String host, int port, int slaveId, int addrNo, String remake) throws Exception {
        switch (addrType) {
            case "0x": {
                return Modbus4jUtils.readCoilStatus((String)host, (int)port, (int)slaveId, (int)addrNo, (String)remake) != false ? Integer.valueOf(1) : Integer.valueOf(0);
            }
            case "1x": {
                return Modbus4jUtils.readInputStatus((String)host, (int)port, (int)slaveId, (int)addrNo, (String)remake) != false ? Integer.valueOf(1) : Integer.valueOf(0);
            }
            case "3x": {
                return Modbus4jUtils.readInputRegister((String)host, (int)port, (int)slaveId, (int)addrNo, (int)2, (String)remake);
            }
            case "4x": {
                return Modbus4jUtils.readHoldingRegister((String)host, (int)port, (int)slaveId, (int)addrNo, (int)2, (String)remake);
            }
        }
        throw new Exception("Unrecognized address types:" + addrType);
    }

    public static Number readSingleValueByDataType(String addrType, String host, int port, int slaveId, int addrNo, int dataType, String remark) throws Exception {
        switch (addrType) {
            case "0x": {
                return Modbus4jUtils.readCoilStatus((String)host, (int)port, (int)slaveId, (int)addrNo, (String)remark) != false ? Integer.valueOf(1) : Integer.valueOf(0);
            }
            case "1x": {
                return Modbus4jUtils.readInputStatus((String)host, (int)port, (int)slaveId, (int)addrNo, (String)remark) != false ? Integer.valueOf(1) : Integer.valueOf(0);
            }
            case "3x": {
                return Modbus4jUtils.readInputRegister((String)host, (int)port, (int)slaveId, (int)addrNo, (int)dataType, (String)remark);
            }
            case "4x": {
                return Modbus4jUtils.readHoldingRegister((String)host, (int)port, (int)slaveId, (int)addrNo, (int)dataType, (String)remark);
            }
        }
        throw new Exception("Unrecognized address types:" + addrType);
    }

    public static Number readSingleValueByInstanceName(String name, Integer addrNo, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        return Modbus4jUtils.readSingleValueByDataType((String)instance.getType(), (String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)(addrNo == null ? instance.getTargetAddr() : addrNo), (int)(instance.getTargetType() == null ? 2 : instance.getTargetType()), (String)remark);
    }

    public static void writeSingleValue(Integer newValue, String addrType, String host, int port, int slaveId, int addrNo, String remake) throws Exception {
        switch (addrType) {
            case "0x": {
                Boolean value = null;
                if (newValue == 0) {
                    value = false;
                } else if (newValue == 1) {
                    value = true;
                } else {
                    throw new Exception("Illegal data, the value written to \u30100x\u3011 can only be 0 or 1\uff01");
                }
                Modbus4jUtils.writeCoilStatus((String)host, (int)port, (int)slaveId, (int)addrNo, (Boolean)value, (String)remake);
                break;
            }
            case "4x": {
                Modbus4jUtils.writeHoldingRegister((String)host, (int)port, (int)slaveId, (int)addrNo, (int)2, (Object)newValue, (String)remake);
                break;
            }
            case "1x": 
            case "3x": {
                throw new Exception("Addresses of type\u3010" + addrType + "\u3011support only read operations");
            }
            default: {
                throw new Exception("Unrecognized address types" + addrType);
            }
        }
    }

    public static void writeSingleValueByDataType(Number newValue, String addrType, String host, int port, int slaveId, int addrNo, int dataType, String remark) throws Exception {
        switch (addrType) {
            case "0x": {
                Boolean value = null;
                if (newValue.intValue() == 0) {
                    value = false;
                } else if (newValue.intValue() == 1) {
                    value = true;
                } else {
                    throw new Exception("Illegal data, the value written to \u30100x\u3011 can only be 0 or 1\uff01");
                }
                Modbus4jUtils.writeCoilStatus((String)host, (int)port, (int)slaveId, (int)addrNo, (Boolean)value, (String)remark);
                break;
            }
            case "4x": {
                Modbus4jUtils.writeHoldingRegister((String)host, (int)port, (int)slaveId, (int)addrNo, (int)dataType, (Object)newValue, (String)remark);
                break;
            }
            case "1x": 
            case "3x": {
                throw new Exception("Addresses of type\u3010" + addrType + "\u3011support only read operations");
            }
            default: {
                throw new Exception("Unrecognized address types" + addrType);
            }
        }
    }

    public static void writeSingleValueByInstanceName(String name, Integer addrNo, Number newValue, String remark) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)name);
        Modbus4jUtils.writeSingleValueByDataType((Number)newValue, (String)instance.getType(), (String)instance.getHost(), (int)instance.getPort(), (int)instance.getSlaveId(), (int)(addrNo == null ? instance.getTargetAddr() : addrNo), (int)(instance.getTargetType() == null ? 2 : instance.getTargetType()), (String)remark);
    }

    public static void main(String[] args) {
        try {
            String ip = "127.0.0.1";
            int port = 502;
            int slaveId = 1;
            int start = 0;
            int len = 2;
            short[] value = new short[]{322, 55};
            Number number = Modbus4jUtils.readHoldingRegister((String)ip, (int)port, (int)slaveId, (int)start, (int)2, (String)"mainTest");
            System.out.println("result:" + number.intValue());
        }
        catch (Exception e) {
            log.error("main Exception", (Throwable)e);
        }
    }

    static {
        List instances = modbusInstanceMapper.findAll();
        for (ModbusInstance instance : instances) {
            modbusInstances.put(instance.getName(), instance);
        }
    }
}

