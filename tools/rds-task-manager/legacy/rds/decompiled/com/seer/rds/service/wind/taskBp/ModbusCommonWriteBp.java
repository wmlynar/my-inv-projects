/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.dao.ModbusWriteResetMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.general.ModbusWriteReset
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.ModbusCommonWriteBp
 *  com.seer.rds.vo.wind.ModbusCommonReadBpField
 *  com.seer.rds.vo.wind.ModbusCommonWriteBpField
 *  com.serotonin.modbus4j.exception.ErrorResponseException
 *  com.serotonin.modbus4j.exception.ModbusInitException
 *  com.serotonin.modbus4j.exception.ModbusTransportException
 *  com.serotonin.modbus4j.sero.messaging.TimeoutException
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.GeneralBusinessMapper;
import com.seer.rds.dao.ModbusWriteResetMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.general.ModbusWriteReset;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ModbusCommonReadBpField;
import com.seer.rds.vo.wind.ModbusCommonWriteBpField;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.exception.ModbusInitException;
import com.serotonin.modbus4j.exception.ModbusTransportException;
import com.serotonin.modbus4j.sero.messaging.TimeoutException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModbusCommonWriteBp")
@Scope(value="prototype")
public class ModbusCommonWriteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusCommonWriteBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private ModbusWriteResetMapper mwr;
    @Autowired
    private GeneralBusinessMapper gbm;
    private String addrType;
    private Integer newValue;
    private String ipModbusHost;
    private Integer ipModbusPort;
    private Integer ipAddress;
    private Integer ipSlaveId;
    private String alias;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.addrType = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonReadBpField.addrType));
        this.ipModbusHost = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteBpField.ipModbusHost));
        this.ipModbusPort = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteBpField.ipModbusPort).toString());
        this.ipAddress = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteBpField.ipAddress).toString());
        this.ipSlaveId = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteBpField.ipSlaveId).toString());
        this.newValue = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteBpField.newValue).toString());
        this.alias = "";
        Object aliasObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonReadBpField.alias);
        if (aliasObj != null) {
            this.alias = String.valueOf(aliasObj);
        }
        boolean modbusException = false;
        int socketExceptionCount = 0;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                switch (this.addrType) {
                    case "0x": {
                        Boolean value = null;
                        if (this.newValue == 0) {
                            value = false;
                        } else if (this.newValue == 1) {
                            value = true;
                        } else {
                            throw new Exception("@{wind.bp.deviceModbusIllegalData}");
                        }
                        Modbus4jUtils.writeCoilStatus((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipAddress, (Boolean)value, (String)this.alias);
                        break;
                    }
                    case "4x": {
                        Modbus4jUtils.writeHoldingRegister((String)this.ipModbusHost, (int)this.ipModbusPort, (int)this.ipSlaveId, (int)this.ipAddress, (int)2, (Object)this.newValue, (String)this.alias);
                        break;
                    }
                    case "1x": 
                    case "3x": {
                        throw new Exception("@{wind.bp.deviceModbusRead}\u3010" + this.addrType + "\u3011");
                    }
                    default: {
                        throw new Exception("@{wind.bp.deviceUnknowType}:" + this.addrType);
                    }
                }
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                socketExceptionCount = Modbus4jUtils.socketExceptionHandle((Exception)e, (int)socketExceptionCount, (String)(this.ipModbusHost + ":" + this.ipModbusPort));
                log.error("ModbusCommonWriteBp [{},{}] {}]", new Object[]{this.ipModbusHost, this.ipModbusPort, e});
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus@{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusCommonWriteBp]modbus@{wind.bp.retry}");
                }
                modbusException = true;
                Thread.sleep(PropConfig.getModbusRetryDelay());
                continue;
            }
            break;
        }
        StringBuilder message = new StringBuilder();
        message.append("ipModbusHost=").append(this.ipModbusHost).append(",ipModbusPort=").append(this.ipModbusPort).append(",ipAddress=").append(this.ipAddress).append(",ipSlaveId=").append(this.ipSlaveId).append(",addrType=").append(this.addrType).append(",newValue=").append(this.newValue).append(",alias=").append(this.alias);
        log.info("ModbusCommonWriteBp " + message);
        this.insertOrUpdateModbusRestRecord(rootBp, this.ipModbusHost, this.ipModbusPort, this.ipSlaveId, this.addrType, this.ipAddress, this.newValue, this.taskRecord);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusCommonWriteBp bpData = new ModbusCommonWriteBp();
        bpData.setIpModbusHost(this.ipModbusHost);
        bpData.setIpModbusPort(this.ipModbusPort);
        bpData.setIpSlaveId(this.ipSlaveId);
        bpData.setIpAddress(this.ipAddress);
        bpData.setNewValue(this.newValue);
        bpData.setAddrType(this.addrType);
        bpData.setAlias(this.alias);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private void insertOrUpdateModbusRestRecord(AbstratRootBp root, String ip, Integer port, Integer slaveId, String addrType, Integer addrNo, Integer value, BaseRecord taskRecord) {
        block6: {
            try {
                String defLabel = taskRecord.getDefLabel();
                List resultList = this.gbm.findAllByLabel(defLabel);
                if (resultList.size() != 1) break block6;
                ModbusWriteReset modbusWriteReset = ModbusWriteReset.builder().writeValue(value).ip(ip).slaveId(slaveId).port(port).addrNo(addrNo).addrType(addrType).taskRecordId(taskRecord.getId()).build();
                AbstratRootBp abstratRootBp = root;
                synchronized (abstratRootBp) {
                    List result = this.mwr.findModbusWriteResetByIpAndPortAndAddrTypeAndAddrNoAndSlaveId(ip, port, addrType, addrNo, slaveId);
                    if (result != null && !result.isEmpty()) {
                        modbusWriteReset.setId(((ModbusWriteReset)result.get(0)).getId());
                    }
                    this.mwr.save((Object)modbusWriteReset);
                }
            }
            catch (Exception e) {
                log.error("error insertOrUpdateModbusRestRecord", (Throwable)e);
            }
        }
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public ModbusWriteResetMapper getMwr() {
        return this.mwr;
    }

    public GeneralBusinessMapper getGbm() {
        return this.gbm;
    }

    public String getAddrType() {
        return this.addrType;
    }

    public Integer getNewValue() {
        return this.newValue;
    }

    public String getIpModbusHost() {
        return this.ipModbusHost;
    }

    public Integer getIpModbusPort() {
        return this.ipModbusPort;
    }

    public Integer getIpAddress() {
        return this.ipAddress;
    }

    public Integer getIpSlaveId() {
        return this.ipSlaveId;
    }

    public String getAlias() {
        return this.alias;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setMwr(ModbusWriteResetMapper mwr) {
        this.mwr = mwr;
    }

    public void setGbm(GeneralBusinessMapper gbm) {
        this.gbm = gbm;
    }

    public void setAddrType(String addrType) {
        this.addrType = addrType;
    }

    public void setNewValue(Integer newValue) {
        this.newValue = newValue;
    }

    public void setIpModbusHost(String ipModbusHost) {
        this.ipModbusHost = ipModbusHost;
    }

    public void setIpModbusPort(Integer ipModbusPort) {
        this.ipModbusPort = ipModbusPort;
    }

    public void setIpAddress(Integer ipAddress) {
        this.ipAddress = ipAddress;
    }

    public void setIpSlaveId(Integer ipSlaveId) {
        this.ipSlaveId = ipSlaveId;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusCommonWriteBp)) {
            return false;
        }
        ModbusCommonWriteBp other = (ModbusCommonWriteBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$newValue = this.getNewValue();
        Integer other$newValue = other.getNewValue();
        if (this$newValue == null ? other$newValue != null : !((Object)this$newValue).equals(other$newValue)) {
            return false;
        }
        Integer this$ipModbusPort = this.getIpModbusPort();
        Integer other$ipModbusPort = other.getIpModbusPort();
        if (this$ipModbusPort == null ? other$ipModbusPort != null : !((Object)this$ipModbusPort).equals(other$ipModbusPort)) {
            return false;
        }
        Integer this$ipAddress = this.getIpAddress();
        Integer other$ipAddress = other.getIpAddress();
        if (this$ipAddress == null ? other$ipAddress != null : !((Object)this$ipAddress).equals(other$ipAddress)) {
            return false;
        }
        Integer this$ipSlaveId = this.getIpSlaveId();
        Integer other$ipSlaveId = other.getIpSlaveId();
        if (this$ipSlaveId == null ? other$ipSlaveId != null : !((Object)this$ipSlaveId).equals(other$ipSlaveId)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        ModbusWriteResetMapper this$mwr = this.getMwr();
        ModbusWriteResetMapper other$mwr = other.getMwr();
        if (this$mwr == null ? other$mwr != null : !this$mwr.equals(other$mwr)) {
            return false;
        }
        GeneralBusinessMapper this$gbm = this.getGbm();
        GeneralBusinessMapper other$gbm = other.getGbm();
        if (this$gbm == null ? other$gbm != null : !this$gbm.equals(other$gbm)) {
            return false;
        }
        String this$addrType = this.getAddrType();
        String other$addrType = other.getAddrType();
        if (this$addrType == null ? other$addrType != null : !this$addrType.equals(other$addrType)) {
            return false;
        }
        String this$ipModbusHost = this.getIpModbusHost();
        String other$ipModbusHost = other.getIpModbusHost();
        if (this$ipModbusHost == null ? other$ipModbusHost != null : !this$ipModbusHost.equals(other$ipModbusHost)) {
            return false;
        }
        String this$alias = this.getAlias();
        String other$alias = other.getAlias();
        return !(this$alias == null ? other$alias != null : !this$alias.equals(other$alias));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusCommonWriteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $newValue = this.getNewValue();
        result = result * 59 + ($newValue == null ? 43 : ((Object)$newValue).hashCode());
        Integer $ipModbusPort = this.getIpModbusPort();
        result = result * 59 + ($ipModbusPort == null ? 43 : ((Object)$ipModbusPort).hashCode());
        Integer $ipAddress = this.getIpAddress();
        result = result * 59 + ($ipAddress == null ? 43 : ((Object)$ipAddress).hashCode());
        Integer $ipSlaveId = this.getIpSlaveId();
        result = result * 59 + ($ipSlaveId == null ? 43 : ((Object)$ipSlaveId).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        ModbusWriteResetMapper $mwr = this.getMwr();
        result = result * 59 + ($mwr == null ? 43 : $mwr.hashCode());
        GeneralBusinessMapper $gbm = this.getGbm();
        result = result * 59 + ($gbm == null ? 43 : $gbm.hashCode());
        String $addrType = this.getAddrType();
        result = result * 59 + ($addrType == null ? 43 : $addrType.hashCode());
        String $ipModbusHost = this.getIpModbusHost();
        result = result * 59 + ($ipModbusHost == null ? 43 : $ipModbusHost.hashCode());
        String $alias = this.getAlias();
        result = result * 59 + ($alias == null ? 43 : $alias.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusCommonWriteBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", mwr=" + this.getMwr() + ", gbm=" + this.getGbm() + ", addrType=" + this.getAddrType() + ", newValue=" + this.getNewValue() + ", ipModbusHost=" + this.getIpModbusHost() + ", ipModbusPort=" + this.getIpModbusPort() + ", ipAddress=" + this.getIpAddress() + ", ipSlaveId=" + this.getIpSlaveId() + ", alias=" + this.getAlias() + ")";
    }
}

