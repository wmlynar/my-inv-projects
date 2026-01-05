/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.OutputParamsVo
 *  com.seer.rds.vo.OutputParamsVo$OutputParamsVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.OutputParamsVo;

public class OutputParamsVo {
    private String taskId;
    private String taskRecordId;
    private String blockId;
    private String paramName;
    private Object paramValue;

    OutputParamsVo(String taskId, String taskRecordId, String blockId, String paramName, Object paramValue) {
        this.taskId = taskId;
        this.taskRecordId = taskRecordId;
        this.blockId = blockId;
        this.paramName = paramName;
        this.paramValue = paramValue;
    }

    public static OutputParamsVoBuilder builder() {
        return new OutputParamsVoBuilder();
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getBlockId() {
        return this.blockId;
    }

    public String getParamName() {
        return this.paramName;
    }

    public Object getParamValue() {
        return this.paramValue;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setBlockId(String blockId) {
        this.blockId = blockId;
    }

    public void setParamName(String paramName) {
        this.paramName = paramName;
    }

    public void setParamValue(Object paramValue) {
        this.paramValue = paramValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OutputParamsVo)) {
            return false;
        }
        OutputParamsVo other = (OutputParamsVo)o;
        if (!other.canEqual((Object)this)) {
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
        String this$blockId = this.getBlockId();
        String other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !this$blockId.equals(other$blockId)) {
            return false;
        }
        String this$paramName = this.getParamName();
        String other$paramName = other.getParamName();
        if (this$paramName == null ? other$paramName != null : !this$paramName.equals(other$paramName)) {
            return false;
        }
        Object this$paramValue = this.getParamValue();
        Object other$paramValue = other.getParamValue();
        return !(this$paramValue == null ? other$paramValue != null : !this$paramValue.equals(other$paramValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OutputParamsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : $blockId.hashCode());
        String $paramName = this.getParamName();
        result = result * 59 + ($paramName == null ? 43 : $paramName.hashCode());
        Object $paramValue = this.getParamValue();
        result = result * 59 + ($paramValue == null ? 43 : $paramValue.hashCode());
        return result;
    }

    public String toString() {
        return "OutputParamsVo(taskId=" + this.getTaskId() + ", taskRecordId=" + this.getTaskRecordId() + ", blockId=" + this.getBlockId() + ", paramName=" + this.getParamName() + ", paramValue=" + this.getParamValue() + ")";
    }
}

