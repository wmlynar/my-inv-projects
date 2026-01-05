/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.model.wind.BaseRecord
 *  javax.persistence.Column
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.MappedSuperclass
 */
package com.seer.rds.model.wind;

import com.seer.rds.annotation.Description;
import java.io.Serializable;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.MappedSuperclass;

@MappedSuperclass
public class BaseRecord
implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    public String id;
    private Integer defVersion;
    @Description(value="@{TaskRecord.createdOn}")
    protected Date createdOn;
    @Description(value="@{TaskRecord.status}")
    protected Integer status;
    @Lob
    protected String taskDefDetail;
    @Lob
    private String inputParams;
    @Lob
    protected String variables;
    protected String projectId;
    @Description(value="@{TaskRecord.endedOn}")
    protected Date endedOn;
    @Lob
    protected String endedReason;
    @Description(value="@{TaskRecord.defId}")
    protected String defId;
    @Column(nullable=true, columnDefinition="varchar(150)")
    @Description(value="@{TaskRecord.defLabel}")
    protected String defLabel;

    public String getId() {
        return this.id;
    }

    public Integer getDefVersion() {
        return this.defVersion;
    }

    public Date getCreatedOn() {
        return this.createdOn;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getTaskDefDetail() {
        return this.taskDefDetail;
    }

    public String getInputParams() {
        return this.inputParams;
    }

    public String getVariables() {
        return this.variables;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public Date getEndedOn() {
        return this.endedOn;
    }

    public String getEndedReason() {
        return this.endedReason;
    }

    public String getDefId() {
        return this.defId;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDefVersion(Integer defVersion) {
        this.defVersion = defVersion;
    }

    public void setCreatedOn(Date createdOn) {
        this.createdOn = createdOn;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setTaskDefDetail(String taskDefDetail) {
        this.taskDefDetail = taskDefDetail;
    }

    public void setInputParams(String inputParams) {
        this.inputParams = inputParams;
    }

    public void setVariables(String variables) {
        this.variables = variables;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setEndedOn(Date endedOn) {
        this.endedOn = endedOn;
    }

    public void setEndedReason(String endedReason) {
        this.endedReason = endedReason;
    }

    public void setDefId(String defId) {
        this.defId = defId;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BaseRecord)) {
            return false;
        }
        BaseRecord other = (BaseRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$defVersion = this.getDefVersion();
        Integer other$defVersion = other.getDefVersion();
        if (this$defVersion == null ? other$defVersion != null : !((Object)this$defVersion).equals(other$defVersion)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Date this$createdOn = this.getCreatedOn();
        Date other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !((Object)this$createdOn).equals(other$createdOn)) {
            return false;
        }
        String this$taskDefDetail = this.getTaskDefDetail();
        String other$taskDefDetail = other.getTaskDefDetail();
        if (this$taskDefDetail == null ? other$taskDefDetail != null : !this$taskDefDetail.equals(other$taskDefDetail)) {
            return false;
        }
        String this$inputParams = this.getInputParams();
        String other$inputParams = other.getInputParams();
        if (this$inputParams == null ? other$inputParams != null : !this$inputParams.equals(other$inputParams)) {
            return false;
        }
        String this$variables = this.getVariables();
        String other$variables = other.getVariables();
        if (this$variables == null ? other$variables != null : !this$variables.equals(other$variables)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
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
        String this$defId = this.getDefId();
        String other$defId = other.getDefId();
        if (this$defId == null ? other$defId != null : !this$defId.equals(other$defId)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        return !(this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BaseRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $defVersion = this.getDefVersion();
        result = result * 59 + ($defVersion == null ? 43 : ((Object)$defVersion).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Date $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : ((Object)$createdOn).hashCode());
        String $taskDefDetail = this.getTaskDefDetail();
        result = result * 59 + ($taskDefDetail == null ? 43 : $taskDefDetail.hashCode());
        String $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : $inputParams.hashCode());
        String $variables = this.getVariables();
        result = result * 59 + ($variables == null ? 43 : $variables.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        Date $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : ((Object)$endedOn).hashCode());
        String $endedReason = this.getEndedReason();
        result = result * 59 + ($endedReason == null ? 43 : $endedReason.hashCode());
        String $defId = this.getDefId();
        result = result * 59 + ($defId == null ? 43 : $defId.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        return result;
    }

    public String toString() {
        return "BaseRecord(id=" + this.getId() + ", defVersion=" + this.getDefVersion() + ", createdOn=" + this.getCreatedOn() + ", status=" + this.getStatus() + ", taskDefDetail=" + this.getTaskDefDetail() + ", inputParams=" + this.getInputParams() + ", variables=" + this.getVariables() + ", projectId=" + this.getProjectId() + ", endedOn=" + this.getEndedOn() + ", endedReason=" + this.getEndedReason() + ", defId=" + this.getDefId() + ", defLabel=" + this.getDefLabel() + ")";
    }

    public BaseRecord() {
    }

    public BaseRecord(String id, Integer defVersion, Date createdOn, Integer status, String taskDefDetail, String inputParams, String variables, String projectId, Date endedOn, String endedReason, String defId, String defLabel) {
        this.id = id;
        this.defVersion = defVersion;
        this.createdOn = createdOn;
        this.status = status;
        this.taskDefDetail = taskDefDetail;
        this.inputParams = inputParams;
        this.variables = variables;
        this.projectId = projectId;
        this.endedOn = endedOn;
        this.endedReason = endedReason;
        this.defId = defId;
        this.defLabel = defLabel;
    }
}

