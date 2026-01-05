/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.TaskLogVo
 *  com.seer.rds.vo.TaskLogVo$TaskLogVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.TaskLogVo;

public class TaskLogVo {
    private String level;
    private String message;
    private String projectId;
    private String taskId;
    private String taskRecordId;
    private Integer blockId;

    public static TaskLogVoBuilder builder() {
        return new TaskLogVoBuilder();
    }

    public String getLevel() {
        return this.level;
    }

    public String getMessage() {
        return this.message;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public Integer getBlockId() {
        return this.blockId;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setBlockId(Integer blockId) {
        this.blockId = blockId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskLogVo)) {
            return false;
        }
        TaskLogVo other = (TaskLogVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$blockId = this.getBlockId();
        Integer other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !((Object)this$blockId).equals(other$blockId)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$message = this.getMessage();
        String other$message = other.getMessage();
        if (this$message == null ? other$message != null : !this$message.equals(other$message)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskLogVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : ((Object)$blockId).hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "TaskLogVo(level=" + this.getLevel() + ", message=" + this.getMessage() + ", projectId=" + this.getProjectId() + ", taskId=" + this.getTaskId() + ", taskRecordId=" + this.getTaskRecordId() + ", blockId=" + this.getBlockId() + ")";
    }

    public TaskLogVo(String level, String message, String projectId, String taskId, String taskRecordId, Integer blockId) {
        this.level = level;
        this.message = message;
        this.projectId = projectId;
        this.taskId = taskId;
        this.taskRecordId = taskRecordId;
        this.blockId = blockId;
    }

    public TaskLogVo() {
    }
}

