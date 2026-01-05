/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.TaskCtrlReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;

@ApiModel(value="\u624b\u52a8\u89e6\u53d1\u4efb\u52a1\u5b9a\u65f6\u5668")
public class TaskCtrlReq
implements Serializable {
    @ApiModelProperty(value="\u4efb\u52a1id")
    private String taskId;
    @ApiModelProperty(value="\u5b9a\u65f6\u5668\u662f\u5426\u53ef\u6267\u884c\u8be5\u4efb\u52a1")
    private Integer status;
    @ApiModelProperty(value="\u5b9a\u65f6\u5668\u662f\u5426\u5f00\u542f")
    private Integer globalStatus;
    @ApiModelProperty(value="\u5b9a\u65f6\u5668\u65f6\u95f4\u8868\u8fbe\u5f0f")
    private String taskCron;

    public String getTaskId() {
        return this.taskId;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Integer getGlobalStatus() {
        return this.globalStatus;
    }

    public String getTaskCron() {
        return this.taskCron;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setGlobalStatus(Integer globalStatus) {
        this.globalStatus = globalStatus;
    }

    public void setTaskCron(String taskCron) {
        this.taskCron = taskCron;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskCtrlReq)) {
            return false;
        }
        TaskCtrlReq other = (TaskCtrlReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Integer this$globalStatus = this.getGlobalStatus();
        Integer other$globalStatus = other.getGlobalStatus();
        if (this$globalStatus == null ? other$globalStatus != null : !((Object)this$globalStatus).equals(other$globalStatus)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskCron = this.getTaskCron();
        String other$taskCron = other.getTaskCron();
        return !(this$taskCron == null ? other$taskCron != null : !this$taskCron.equals(other$taskCron));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskCtrlReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Integer $globalStatus = this.getGlobalStatus();
        result = result * 59 + ($globalStatus == null ? 43 : ((Object)$globalStatus).hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskCron = this.getTaskCron();
        result = result * 59 + ($taskCron == null ? 43 : $taskCron.hashCode());
        return result;
    }

    public String toString() {
        return "TaskCtrlReq(taskId=" + this.getTaskId() + ", status=" + this.getStatus() + ", globalStatus=" + this.getGlobalStatus() + ", taskCron=" + this.getTaskCron() + ")";
    }
}

