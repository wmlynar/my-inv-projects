/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.TaskEventVo
 *  com.seer.rds.vo.TaskEventVo$TaskEventVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.TaskEventVo;
import java.io.Serializable;

public class TaskEventVo
implements Serializable {
    private String taskId;
    private String taskLabel;
    private String eventName;
    private Object eventData;

    TaskEventVo(String taskId, String taskLabel, String eventName, Object eventData) {
        this.taskId = taskId;
        this.taskLabel = taskLabel;
        this.eventName = eventName;
        this.eventData = eventData;
    }

    public static TaskEventVoBuilder builder() {
        return new TaskEventVoBuilder();
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public String getEventName() {
        return this.eventName;
    }

    public Object getEventData() {
        return this.eventData;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public void setEventData(Object eventData) {
        this.eventData = eventData;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskEventVo)) {
            return false;
        }
        TaskEventVo other = (TaskEventVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        if (this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel)) {
            return false;
        }
        String this$eventName = this.getEventName();
        String other$eventName = other.getEventName();
        if (this$eventName == null ? other$eventName != null : !this$eventName.equals(other$eventName)) {
            return false;
        }
        Object this$eventData = this.getEventData();
        Object other$eventData = other.getEventData();
        return !(this$eventData == null ? other$eventData != null : !this$eventData.equals(other$eventData));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskEventVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        String $eventName = this.getEventName();
        result = result * 59 + ($eventName == null ? 43 : $eventName.hashCode());
        Object $eventData = this.getEventData();
        result = result * 59 + ($eventData == null ? 43 : $eventData.hashCode());
        return result;
    }

    public String toString() {
        return "TaskEventVo(taskId=" + this.getTaskId() + ", taskLabel=" + this.getTaskLabel() + ", eventName=" + this.getEventName() + ", eventData=" + this.getEventData() + ")";
    }
}

