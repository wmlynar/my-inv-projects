/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.digitalpetri.modbus.master.ModbusTcpMaster
 *  com.digitalpetri.modbus.master.ModbusTcpMasterConfig
 *  com.digitalpetri.modbus.master.ModbusTcpMasterConfig$Builder
 *  com.digitalpetri.modbus.requests.ModbusRequest
 *  com.digitalpetri.modbus.requests.ReadCoilsRequest
 *  com.digitalpetri.modbus.requests.ReadDiscreteInputsRequest
 *  com.digitalpetri.modbus.requests.ReadHoldingRegistersRequest
 *  com.digitalpetri.modbus.requests.ReadInputRegistersRequest
 *  com.digitalpetri.modbus.requests.WriteMultipleCoilsRequest
 *  com.digitalpetri.modbus.requests.WriteMultipleRegistersRequest
 *  com.digitalpetri.modbus.requests.WriteSingleCoilRequest
 *  com.digitalpetri.modbus.requests.WriteSingleRegisterRequest
 *  com.digitalpetri.modbus.responses.ReadCoilsResponse
 *  com.digitalpetri.modbus.responses.ReadDiscreteInputsResponse
 *  com.digitalpetri.modbus.responses.ReadHoldingRegistersResponse
 *  com.digitalpetri.modbus.responses.ReadInputRegistersResponse
 *  com.seer.rds.modbus.ModbusClient
 *  io.netty.buffer.ByteBuf
 *  io.netty.buffer.ByteBufUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.modbus;

import com.digitalpetri.modbus.master.ModbusTcpMaster;
import com.digitalpetri.modbus.master.ModbusTcpMasterConfig;
import com.digitalpetri.modbus.requests.ModbusRequest;
import com.digitalpetri.modbus.requests.ReadCoilsRequest;
import com.digitalpetri.modbus.requests.ReadDiscreteInputsRequest;
import com.digitalpetri.modbus.requests.ReadHoldingRegistersRequest;
import com.digitalpetri.modbus.requests.ReadInputRegistersRequest;
import com.digitalpetri.modbus.requests.WriteMultipleCoilsRequest;
import com.digitalpetri.modbus.requests.WriteMultipleRegistersRequest;
import com.digitalpetri.modbus.requests.WriteSingleCoilRequest;
import com.digitalpetri.modbus.requests.WriteSingleRegisterRequest;
import com.digitalpetri.modbus.responses.ReadCoilsResponse;
import com.digitalpetri.modbus.responses.ReadDiscreteInputsResponse;
import com.digitalpetri.modbus.responses.ReadHoldingRegistersResponse;
import com.digitalpetri.modbus.responses.ReadInputRegistersResponse;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufUtil;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ModbusClient {
    private static final Logger log = LoggerFactory.getLogger(ModbusClient.class);
    private String host;
    private Integer port;
    private ModbusTcpMaster master;
    private volatile Integer retryTimes = 0;
    private volatile boolean reconnecting = false;
    private Integer printInterval = 10;
    private Map<Integer, Integer> lastRead = new ConcurrentHashMap();

    public ModbusClient(String host, Integer port) {
        this.host = host;
        this.port = port;
    }

    public void init() {
        ModbusTcpMasterConfig config = new ModbusTcpMasterConfig.Builder(this.host).setPort(this.port.intValue()).build();
        this.master = new ModbusTcpMaster(config);
        this.master.connect();
    }

    public Boolean isReconnecting() {
        return this.reconnecting;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void reconnecting() {
        if (this.reconnecting) {
            return;
        }
        this.reconnecting = true;
        long sleepTime = 0L;
        if (this.retryTimes < 10) {
            sleepTime = 5000L;
        } else if (this.retryTimes < 30) {
            sleepTime = 10000L;
        } else if (this.retryTimes < 50) {
            sleepTime = 30000L;
        } else {
            this.retryTimes = 0;
            sleepTime = 5000L;
        }
        try {
            log.info("[{},{}] try to reconnect $retryTimes ...", (Object)this.host, (Object)this.port);
            this.master.disconnect();
            Thread.sleep(sleepTime);
            log.info("[{}, {}] reconnected $retryTimes ...", (Object)this.host, (Object)this.port);
            this.master.connect();
            Integer n = this.retryTimes;
            this.retryTimes = this.retryTimes + 1;
        }
        catch (Exception e) {
            log.error("reconnecting", (Throwable)e);
        }
        finally {
            this.reconnecting = false;
        }
    }

    public ByteBuf fc01ReadCoils(Integer startAddress, Integer quantity, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        ReadCoilsRequest req = new ReadCoilsRequest(startAddress.intValue(), quantity.intValue());
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        ByteBuf data = ((ReadCoilsResponse)res.get()).getCoilStatus();
        if (this.lastRead.get(startAddress) == null || ((Integer)this.lastRead.get(startAddress)).equals(this.printInterval)) {
            log.debug("ModbusTCP FC01, start address: {}, quantity: {}, slaveId: {}, logMsg: {}, data: {}", new Object[]{startAddress, quantity, slaveId, logMsg, data != null ? ByteBufUtil.hexDump((ByteBuf)data) : ""});
            this.lastRead.put(startAddress, 1);
        } else {
            this.lastRead.put(startAddress, (Integer)this.lastRead.get(startAddress) + 1);
        }
        this.retryTimes = 0;
        return data;
    }

    public ByteBuf fc02ReadInputCoils(Integer startAddress, Integer quantity, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        ReadDiscreteInputsRequest req = new ReadDiscreteInputsRequest(startAddress.intValue(), quantity.intValue());
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        ByteBuf data = ((ReadDiscreteInputsResponse)res.get()).getInputStatus();
        if (this.lastRead.get(startAddress) == null || ((Integer)this.lastRead.get(startAddress)).equals(this.printInterval)) {
            log.debug("ModbusTCP FC02, start address: {}, quantity: {}, slaveId: {}, logMsg: {}, data: {}", new Object[]{startAddress, quantity, slaveId, logMsg, data != null ? ByteBufUtil.hexDump((ByteBuf)data) : ""});
            this.lastRead.put(startAddress, 1);
        } else {
            this.lastRead.put(startAddress, (Integer)this.lastRead.get(startAddress) + 1);
        }
        this.retryTimes = 0;
        return data;
    }

    public ByteBuf fc03ReadRegisters(Integer startAddress, Integer quantity, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        ReadHoldingRegistersRequest req = new ReadHoldingRegistersRequest(startAddress.intValue(), quantity.intValue());
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        ByteBuf data = ((ReadHoldingRegistersResponse)res.get()).getRegisters();
        if (this.lastRead.get(startAddress) == null || ((Integer)this.lastRead.get(startAddress)).equals(this.printInterval)) {
            log.debug("ModbusTCP FC03, start address: {}, quantity: {}, slaveId: {}, logMsg: {}, data: {}", new Object[]{startAddress, quantity, slaveId, logMsg, data != null ? ByteBufUtil.hexDump((ByteBuf)data) : ""});
            this.lastRead.put(startAddress, 1);
        } else {
            this.lastRead.put(startAddress, (Integer)this.lastRead.get(startAddress) + 1);
        }
        this.retryTimes = 0;
        return data;
    }

    public ByteBuf fc04ReadInputRegisters(Integer startAddress, Integer quantity, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        ReadInputRegistersRequest req = new ReadInputRegistersRequest(startAddress.intValue(), quantity.intValue());
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        ByteBuf data = ((ReadInputRegistersResponse)res.get()).getRegisters();
        if (this.lastRead.get(startAddress) == null || ((Integer)this.lastRead.get(startAddress)).equals(this.printInterval)) {
            log.debug("ModbusTCP FC04, start address: {}, quantity: {}, slaveId: {}, logMsg: {}, data: {}", new Object[]{startAddress, quantity, slaveId, logMsg, data != null ? ByteBufUtil.hexDump((ByteBuf)data) : ""});
            this.lastRead.put(startAddress, 1);
        } else {
            this.lastRead.put(startAddress, (Integer)this.lastRead.get(startAddress) + 1);
        }
        this.retryTimes = 0;
        return data;
    }

    public void fc05WriteSingleCoil(Integer address, Boolean value, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        WriteSingleCoilRequest req = new WriteSingleCoilRequest(address.intValue(), value.booleanValue());
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        res.get();
        log.debug("ModbusTCP FC05, address: {}, slaveId: {}, logMsg: {}, data:{}", new Object[]{address, slaveId, logMsg, value});
        this.retryTimes = 0;
    }

    public void fc06WriteSingleRegister(Integer address, Integer value, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        WriteSingleRegisterRequest req = new WriteSingleRegisterRequest(address.intValue(), value.intValue());
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        res.get();
        log.debug("ModbusTCP FC06, address: {}, slaveId: {}, logMsg: {}, data:{}", new Object[]{address, slaveId, logMsg, value});
        this.retryTimes = 0;
    }

    public void fc0FWriteMultipleCoils(Integer startAddress, Integer quantity, byte[] value, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        WriteMultipleCoilsRequest req = new WriteMultipleCoilsRequest(startAddress.intValue(), quantity.intValue(), value);
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        res.get();
        log.debug("ModbusTCP FC0F, start address: {}, quantity: {}, slaveId: {}, logMsg: {}, data:{}", new Object[]{startAddress, quantity, slaveId, logMsg, value});
        this.retryTimes = 0;
    }

    public void fc10WriteMultipleRegisters(Integer startAddress, Integer quantity, byte[] value, Integer slaveId, String logMsg) throws ExecutionException, InterruptedException {
        WriteMultipleRegistersRequest req = new WriteMultipleRegistersRequest(startAddress.intValue(), quantity.intValue(), value);
        CompletableFuture res = this.master.sendRequest((ModbusRequest)req, slaveId.intValue());
        res.get();
        log.debug("ModbusTCP FC10, start address: {}, quantity: {}, slaveId: {}, logMsg: {}, data:{}", new Object[]{startAddress, quantity, slaveId, logMsg, value});
        this.retryTimes = 0;
    }
}

