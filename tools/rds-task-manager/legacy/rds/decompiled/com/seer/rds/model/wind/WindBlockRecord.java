/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindBlockRecord$WindBlockRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.annotation.Description;
import com.seer.rds.model.wind.WindBlockRecord;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windblockrecord", indexes={@Index(name="taskIdIndex", columnList="taskId"), @Index(name="taskRecordIdIndex", columnList="taskRecordId"), @Index(name="startedOnIndex", columnList="startedOn"), @Index(name="orderIdIndex", columnList="orderId")})
public class WindBlockRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String projectId;
    private Integer version;
    @Description(value="@{WindBlockRecord.blockConfigId}")
    private String blockConfigId;
    @Description(value="@{WindBlockRecord.blockName}")
    private String blockName;
    @Description(value="@{WindBlockRecord.taskId}")
    private String taskId;
    @Description(value="@{WindBlockRecord.taskRecordId}")
    private String taskRecordId;
    @Description(value="@{WindBlockRecord.status}")
    private Integer status;
    private Integer ctrlStatus;
    @Description(value="@{WindBlockRecord.startedOn}")
    private Date startedOn;
    @Description(value="@{WindBlockRecord.endedOn}")
    private Date endedOn;
    @Lob
    @Description(value="@{WindBlockRecord.endedReason}")
    private String endedReason;
    @Lob
    private String internalVariables;
    @Lob
    private String outputParams;
    @Lob
    private String inputParams;
    @Lob
    private String blockInputParams;
    @Lob
    @Description(value="@{WindBlockRecord.blockInputParamsValue}")
    private String blockInputParamsValue;
    @Lob
    @Description(value="@{WindBlockRecord.blockOutParamsValue}")
    private String blockOutParamsValue;
    @Lob
    private String blockInternalVariables;
    @Description(value="@{WindBlockRecord.blockId}")
    private String blockId;
    @Description(value="@{WindBlockRecord.orderId}")
    private String orderId;
    @Lob
    private String remark;

    public WindBlockRecord(String blockConfigId, String blockName, Integer status, Date startedOn, Date endedOn, String endedReason, String remark) {
        this.blockConfigId = blockConfigId;
        this.blockName = blockName;
        this.status = status;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.endedReason = endedReason;
        this.remark = remark;
    }

    public static WindBlockRecordBuilder builder() {
        return new WindBlockRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public Integer getVersion() {
        return this.version;
    }

    public String getBlockConfigId() {
        return this.blockConfigId;
    }

    public String getBlockName() {
        return this.blockName;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Integer getCtrlStatus() {
        return this.ctrlStatus;
    }

    public Date getStartedOn() {
        return this.startedOn;
    }

    public Date getEndedOn() {
        return this.endedOn;
    }

    public String getEndedReason() {
        return this.endedReason;
    }

    public String getInternalVariables() {
        return this.internalVariables;
    }

    public String getOutputParams() {
        return this.outputParams;
    }

    public String getInputParams() {
        return this.inputParams;
    }

    public String getBlockInputParams() {
        return this.blockInputParams;
    }

    public String getBlockInputParamsValue() {
        return this.blockInputParamsValue;
    }

    public String getBlockOutParamsValue() {
        return this.blockOutParamsValue;
    }

    public String getBlockInternalVariables() {
        return this.blockInternalVariables;
    }

    public String getBlockId() {
        return this.blockId;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public String getRemark() {
        return this.remark;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public void setBlockConfigId(String blockConfigId) {
        this.blockConfigId = blockConfigId;
    }

    public void setBlockName(String blockName) {
        this.blockName = blockName;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCtrlStatus(Integer ctrlStatus) {
        this.ctrlStatus = ctrlStatus;
    }

    public void setStartedOn(Date startedOn) {
        this.startedOn = startedOn;
    }

    public void setEndedOn(Date endedOn) {
        this.endedOn = endedOn;
    }

    public void setEndedReason(String endedReason) {
        this.endedReason = endedReason;
    }

    public void setInternalVariables(String internalVariables) {
        this.internalVariables = internalVariables;
    }

    public void setOutputParams(String outputParams) {
        this.outputParams = outputParams;
    }

    public void setInputParams(String inputParams) {
        this.inputParams = inputParams;
    }

    public void setBlockInputParams(String blockInputParams) {
        this.blockInputParams = blockInputParams;
    }

    public void setBlockInputParamsValue(String blockInputParamsValue) {
        this.blockInputParamsValue = blockInputParamsValue;
    }

    public void setBlockOutParamsValue(String blockOutParamsValue) {
        this.blockOutParamsValue = blockOutParamsValue;
    }

    public void setBlockInternalVariables(String blockInternalVariables) {
        this.blockInternalVariables = blockInternalVariables;
    }

    public void setBlockId(String blockId) {
        this.blockId = blockId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindBlockRecord)) {
            return false;
        }
        WindBlockRecord other = (WindBlockRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Integer this$ctrlStatus = this.getCtrlStatus();
        Integer other$ctrlStatus = other.getCtrlStatus();
        if (this$ctrlStatus == null ? other$ctrlStatus != null : !((Object)this$ctrlStatus).equals(other$ctrlStatus)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
            return false;
        }
        String this$blockConfigId = this.getBlockConfigId();
        String other$blockConfigId = other.getBlockConfigId();
        if (this$blockConfigId == null ? other$blockConfigId != null : !this$blockConfigId.equals(other$blockConfigId)) {
            return false;
        }
        String this$blockName = this.getBlockName();
        String other$blockName = other.getBlockName();
        if (this$blockName == null ? other$blockName != null : !this$blockName.equals(other$blockName)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        Date this$startedOn = this.getStartedOn();
        Date other$startedOn = other.getStartedOn();
        if (this$startedOn == null ? other$startedOn != null : !((Object)this$startedOn).equals(other$startedOn)) {
            return false;
        }
        Date this$endedOn = this.getEndedOn();
        Date other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !((Object)this$endedOn).equals(other$endedOn)) {
            return false;
        }
        String this$endedReason = this.getEndedReason();
        String other$endedReason = other.getEndedReason();
        if (this$endedReason == null ? other$endedReason != null : !this$endedReason.equals(other$endedReason)) {
            return false;
        }
        String this$internalVariables = this.getInternalVariables();
        String other$internalVariables = other.getInternalVariables();
        if (this$internalVariables == null ? other$internalVariables != null : !this$internalVariables.equals(other$internalVariables)) {
            return false;
        }
        String this$outputParams = this.getOutputParams();
        String other$outputParams = other.getOutputParams();
        if (this$outputParams == null ? other$outputParams != null : !this$outputParams.equals(other$outputParams)) {
            return false;
        }
        String this$inputParams = this.getInputParams();
        String other$inputParams = other.getInputParams();
        if (this$inputParams == null ? other$inputParams != null : !this$inputParams.equals(other$inputParams)) {
            return false;
        }
        String this$blockInputParams = this.getBlockInputParams();
        String other$blockInputParams = other.getBlockInputParams();
        if (this$blockInputParams == null ? other$blockInputParams != null : !this$blockInputParams.equals(other$blockInputParams)) {
            return false;
        }
        String this$blockInputParamsValue = this.getBlockInputParamsValue();
        String other$blockInputParamsValue = other.getBlockInputParamsValue();
        if (this$blockInputParamsValue == null ? other$blockInputParamsValue != null : !this$blockInputParamsValue.equals(other$blockInputParamsValue)) {
            return false;
        }
        String this$blockOutParamsValue = this.getBlockOutParamsValue();
        String other$blockOutParamsValue = other.getBlockOutParamsValue();
        if (this$blockOutParamsValue == null ? other$blockOutParamsValue != null : !this$blockOutParamsValue.equals(other$blockOutParamsValue)) {
            return false;
        }
        String this$blockInternalVariables = this.getBlockInternalVariables();
        String other$blockInternalVariables = other.getBlockInternalVariables();
        if (this$blockInternalVariables == null ? other$blockInternalVariables != null : !this$blockInternalVariables.equals(other$blockInternalVariables)) {
            return false;
        }
        String this$blockId = this.getBlockId();
        String other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !this$blockId.equals(other$blockId)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        return !(this$remark == null ? other$remark != null : !this$remark.equals(other$remark));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindBlockRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Integer $ctrlStatus = this.getCtrlStatus();
        result = result * 59 + ($ctrlStatus == null ? 43 : ((Object)$ctrlStatus).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $blockConfigId = this.getBlockConfigId();
        result = result * 59 + ($blockConfigId == null ? 43 : $blockConfigId.hashCode());
        String $blockName = this.getBlockName();
        result = result * 59 + ($blockName == null ? 43 : $blockName.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        Date $startedOn = this.getStartedOn();
        result = result * 59 + ($startedOn == null ? 43 : ((Object)$startedOn).hashCode());
        Date $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : ((Object)$endedOn).hashCode());
        String $endedReason = this.getEndedReason();
        result = result * 59 + ($endedReason == null ? 43 : $endedReason.hashCode());
        String $internalVariables = this.getInternalVariables();
        result = result * 59 + ($internalVariables == null ? 43 : $internalVariables.hashCode());
        String $outputParams = this.getOutputParams();
        result = result * 59 + ($outputParams == null ? 43 : $outputParams.hashCode());
        String $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : $inputParams.hashCode());
        String $blockInputParams = this.getBlockInputParams();
        result = result * 59 + ($blockInputParams == null ? 43 : $blockInputParams.hashCode());
        String $blockInputParamsValue = this.getBlockInputParamsValue();
        result = result * 59 + ($blockInputParamsValue == null ? 43 : $blockInputParamsValue.hashCode());
        String $blockOutParamsValue = this.getBlockOutParamsValue();
        result = result * 59 + ($blockOutParamsValue == null ? 43 : $blockOutParamsValue.hashCode());
        String $blockInternalVariables = this.getBlockInternalVariables();
        result = result * 59 + ($blockInternalVariables == null ? 43 : $blockInternalVariables.hashCode());
        String $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : $blockId.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        return result;
    }

    public String toString() {
        return "WindBlockRecord(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", version=" + this.getVersion() + ", blockConfigId=" + this.getBlockConfigId() + ", blockName=" + this.getBlockName() + ", taskId=" + this.getTaskId() + ", taskRecordId=" + this.getTaskRecordId() + ", status=" + this.getStatus() + ", ctrlStatus=" + this.getCtrlStatus() + ", startedOn=" + this.getStartedOn() + ", endedOn=" + this.getEndedOn() + ", endedReason=" + this.getEndedReason() + ", internalVariables=" + this.getInternalVariables() + ", outputParams=" + this.getOutputParams() + ", inputParams=" + this.getInputParams() + ", blockInputParams=" + this.getBlockInputParams() + ", blockInputParamsValue=" + this.getBlockInputParamsValue() + ", blockOutParamsValue=" + this.getBlockOutParamsValue() + ", blockInternalVariables=" + this.getBlockInternalVariables() + ", blockId=" + this.getBlockId() + ", orderId=" + this.getOrderId() + ", remark=" + this.getRemark() + ")";
    }

    public WindBlockRecord() {
    }

    public WindBlockRecord(String id, String projectId, Integer version, String blockConfigId, String blockName, String taskId, String taskRecordId, Integer status, Integer ctrlStatus, Date startedOn, Date endedOn, String endedReason, String internalVariables, String outputParams, String inputParams, String blockInputParams, String blockInputParamsValue, String blockOutParamsValue, String blockInternalVariables, String blockId, String orderId, String remark) {
        this.id = id;
        this.projectId = projectId;
        this.version = version;
        this.blockConfigId = blockConfigId;
        this.blockName = blockName;
        this.taskId = taskId;
        this.taskRecordId = taskRecordId;
        this.status = status;
        this.ctrlStatus = ctrlStatus;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.endedReason = endedReason;
        this.internalVariables = internalVariables;
        this.outputParams = outputParams;
        this.inputParams = inputParams;
        this.blockInputParams = blockInputParams;
        this.blockInputParamsValue = blockInputParamsValue;
        this.blockOutParamsValue = blockOutParamsValue;
        this.blockInternalVariables = blockInternalVariables;
        this.blockId = blockId;
        this.orderId = orderId;
        this.remark = remark;
    }
}

