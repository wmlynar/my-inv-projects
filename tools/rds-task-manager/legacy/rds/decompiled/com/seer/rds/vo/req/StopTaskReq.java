/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.StopTaskReq
 *  com.seer.rds.vo.req.StopTaskReq$StopTaskReqBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  lombok.NonNull
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.StopTaskReq;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;
import lombok.NonNull;

@ApiModel(value="model to stop task")
public class StopTaskReq
implements Serializable {
    @ApiModelProperty(value="releaseSite", name="releaseSite", required=true)
    @NonNull
    private int releaseSite;
    @ApiModelProperty(value="taskRecordId", name="taskRecordId", required=false)
    private String taskRecordId;
    @ApiModelProperty(value="taskLabel", name="taskLabel", required=false)
    private String taskLabel;

    public static StopTaskReqBuilder builder() {
        return new StopTaskReqBuilder();
    }

    @NonNull
    public int getReleaseSite() {
        return this.releaseSite;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public void setReleaseSite(@NonNull int releaseSite) {
        this.releaseSite = releaseSite;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StopTaskReq)) {
            return false;
        }
        StopTaskReq other = (StopTaskReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getReleaseSite() != other.getReleaseSite()) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        return !(this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StopTaskReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getReleaseSite();
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        return result;
    }

    public String toString() {
        return "StopTaskReq(releaseSite=" + this.getReleaseSite() + ", taskRecordId=" + this.getTaskRecordId() + ", taskLabel=" + this.getTaskLabel() + ")";
    }

    public StopTaskReq(@NonNull int releaseSite, String taskRecordId, String taskLabel) {
        this.releaseSite = releaseSite;
        this.taskRecordId = taskRecordId;
        this.taskLabel = taskLabel;
    }

    public StopTaskReq() {
    }
}

