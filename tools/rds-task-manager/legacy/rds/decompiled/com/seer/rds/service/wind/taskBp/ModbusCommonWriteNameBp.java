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
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.ModbusCommonWriteNameBp
 *  com.seer.rds.vo.wind.ModbusCommonWriteNameBpField
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
import com.seer.rds.model.modbus.ModbusInstance;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ModbusCommonWriteNameBpField;
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

@Component(value="ModbusCommonWriteNameBp")
@Scope(value="prototype")
public class ModbusCommonWriteNameBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusCommonWriteNameBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private ModbusWriteResetMapper mwr;
    @Autowired
    private GeneralBusinessMapper gbm;
    private Integer newValue;
    private String instanceName;
    private Integer address;
    private String remark;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.instanceName = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteNameBpField.instanceName));
        Object inputParamAddr = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteNameBpField.address);
        this.address = inputParamAddr == null ? null : Integer.valueOf(inputParamAddr.toString());
        this.newValue = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteNameBpField.newValue).toString());
        this.remark = "";
        Object aliasObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWriteNameBpField.remark);
        if (aliasObj != null) {
            this.remark = String.valueOf(aliasObj);
        }
        boolean modbusException = false;
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                Modbus4jUtils.writeSingleValueByInstanceName((String)this.instanceName, (Integer)this.address, (Number)this.newValue, (String)this.remark);
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                log.error("ModbusCommonWriteNameBp [{}] {}", (Object)this.instanceName, (Object)e.getMessage());
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "modbus@{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusCommonWriteNameBp]modbus@{wind.bp.retry}");
                }
                modbusException = true;
                Thread.sleep(PropConfig.getModbusRetryDelay());
                continue;
            }
            break;
        }
        StringBuilder message = new StringBuilder();
        message.append("instanceName=").append(this.instanceName).append(",address=").append(this.address).append(",newValue=").append(this.newValue).append(",remark=").append(this.remark);
        log.info("ModbusCommonWriteNameBp " + message);
        ModbusInstance instance = Modbus4jUtils.getInstance((String)this.instanceName);
        this.insertOrUpdateModbusRestRecord(rootBp, instance.getHost(), instance.getPort(), instance.getSlaveId(), instance.getType(), instance.getTargetAddr(), this.newValue, this.taskRecord);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusCommonWriteNameBp bpData = new ModbusCommonWriteNameBp();
        bpData.setInstanceName(this.instanceName);
        bpData.setAddress(this.address);
        bpData.setNewValue(this.newValue);
        bpData.setRemark(this.remark);
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

    public Integer getNewValue() {
        return this.newValue;
    }

    public String getInstanceName() {
        return this.instanceName;
    }

    public Integer getAddress() {
        return this.address;
    }

    public String getRemark() {
        return this.remark;
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

    public void setNewValue(Integer newValue) {
        this.newValue = newValue;
    }

    public void setInstanceName(String instanceName) {
        this.instanceName = instanceName;
    }

    public void setAddress(Integer address) {
        this.address = address;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusCommonWriteNameBp)) {
            return false;
        }
        ModbusCommonWriteNameBp other = (ModbusCommonWriteNameBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$newValue = this.getNewValue();
        Integer other$newValue = other.getNewValue();
        if (this$newValue == null ? other$newValue != null : !((Object)this$newValue).equals(other$newValue)) {
            return false;
        }
        Integer this$address = this.getAddress();
        Integer other$address = other.getAddress();
        if (this$address == null ? other$address != null : !((Object)this$address).equals(other$address)) {
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
        String this$instanceName = this.getInstanceName();
        String other$instanceName = other.getInstanceName();
        if (this$instanceName == null ? other$instanceName != null : !this$instanceName.equals(other$instanceName)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        return !(this$remark == null ? other$remark != null : !this$remark.equals(other$remark));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModbusCommonWriteNameBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $newValue = this.getNewValue();
        result = result * 59 + ($newValue == null ? 43 : ((Object)$newValue).hashCode());
        Integer $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : ((Object)$address).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        ModbusWriteResetMapper $mwr = this.getMwr();
        result = result * 59 + ($mwr == null ? 43 : $mwr.hashCode());
        GeneralBusinessMapper $gbm = this.getGbm();
        result = result * 59 + ($gbm == null ? 43 : $gbm.hashCode());
        String $instanceName = this.getInstanceName();
        result = result * 59 + ($instanceName == null ? 43 : $instanceName.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusCommonWriteNameBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", mwr=" + this.getMwr() + ", gbm=" + this.getGbm() + ", newValue=" + this.getNewValue() + ", instanceName=" + this.getInstanceName() + ", address=" + this.getAddress() + ", remark=" + this.getRemark() + ")";
    }
}

