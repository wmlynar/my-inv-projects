/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.ModbusCommonWaitNameBp
 *  com.seer.rds.vo.wind.ModbusCommonWaitNameBpField
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
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ModbusCommonWaitNameBpField;
import com.serotonin.modbus4j.exception.ErrorResponseException;
import com.serotonin.modbus4j.exception.ModbusInitException;
import com.serotonin.modbus4j.exception.ModbusTransportException;
import com.serotonin.modbus4j.sero.messaging.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModbusCommonWaitNameBp")
@Scope(value="prototype")
public class ModbusCommonWaitNameBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModbusCommonWaitNameBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private String instanceName;
    private Integer address;
    private String remark;
    private Integer targetValue;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
        this.instanceName = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWaitNameBpField.instanceName));
        Object inputParamAddr = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWaitNameBpField.address);
        this.address = inputParamAddr == null ? null : Integer.valueOf(inputParamAddr.toString());
        this.targetValue = Integer.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWaitNameBpField.targetValue).toString());
        this.remark = "";
        Object aliasObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModbusCommonWaitNameBpField.remark);
        if (aliasObj != null) {
            this.remark = String.valueOf(aliasObj);
        }
        Number modbusValue = null;
        boolean modbusException = false;
        StringBuilder message = new StringBuilder();
        message.append("instanceName=").append(this.instanceName).append(",address=").append(this.address).append(",targetValue=").append(this.targetValue).append(",remark=").append(this.remark);
        log.info("ModbusCommonWaitNameBp " + message);
        while (true) {
            try {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                modbusValue = Modbus4jUtils.readSingleValueByInstanceName((String)this.instanceName, (Integer)this.address, (String)this.remark);
                if (this.targetValue.equals(modbusValue)) {
                    log.info("status: {}, coilStatus: {}", (Object)modbusValue, (Object)this.targetValue);
                    break;
                }
                this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}:%s, @{wind.bp.deviceReality}:%s", this.targetValue, modbusValue));
                if (modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusCommonWaitNameBp]modbus\u5df2\u91cd\u65b0\u8fde\u63a5");
                }
                modbusException = false;
            }
            catch (Exception e) {
                if (!(e instanceof ErrorResponseException || e instanceof ModbusTransportException || e instanceof TimeoutException || e instanceof ModbusInitException)) {
                    throw e;
                }
                log.error("ModbusCommonWaitNameBp [{}] {}", (Object)this.instanceName, (Object)e.getMessage());
                this.saveLogError(e.getMessage());
                if (!modbusException) {
                    this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                    this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
                    this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
                    this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "@{wind.bp.retry}...");
                    this.windService.updateTaskRecordEndedReason(this.taskRecord.getId(), "[ModbusCommonWaitBp]@{wind.bp.retry}");
                }
                modbusException = true;
            }
            Thread.sleep(PropConfig.getModbusRetryDelay());
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModbusCommonWaitNameBp bpData = new ModbusCommonWaitNameBp();
        bpData.setInstanceName(this.instanceName);
        bpData.setAddress(this.address);
        bpData.setRemark(this.remark);
        bpData.setTargetValue(this.targetValue);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
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

    public Integer getTargetValue() {
        return this.targetValue;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
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

    public void setTargetValue(Integer targetValue) {
        this.targetValue = targetValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModbusCommonWaitNameBp)) {
            return false;
        }
        ModbusCommonWaitNameBp other = (ModbusCommonWaitNameBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$address = this.getAddress();
        Integer other$address = other.getAddress();
        if (this$address == null ? other$address != null : !((Object)this$address).equals(other$address)) {
            return false;
        }
        Integer this$targetValue = this.getTargetValue();
        Integer other$targetValue = other.getTargetValue();
        if (this$targetValue == null ? other$targetValue != null : !((Object)this$targetValue).equals(other$targetValue)) {
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
        return other instanceof ModbusCommonWaitNameBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : ((Object)$address).hashCode());
        Integer $targetValue = this.getTargetValue();
        result = result * 59 + ($targetValue == null ? 43 : ((Object)$targetValue).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $instanceName = this.getInstanceName();
        result = result * 59 + ($instanceName == null ? 43 : $instanceName.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "ModbusCommonWaitNameBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", instanceName=" + this.getInstanceName() + ", address=" + this.getAddress() + ", remark=" + this.getRemark() + ", targetValue=" + this.getTargetValue() + ")";
    }
}

