/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.model.wind.WindTaskLog$WindTaskLogBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindTaskLog;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtasklog", indexes={@Index(name="taskLogIdIndex", columnList="taskRecordId")})
public class WindTaskLog {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String projectId;
    private String taskId;
    private String taskRecordId;
    private Integer taskBlockId;
    @Lob
    private String message;
    @Column(name="\"level\"")
    private String level;
    private Date createTime;

    public WindTaskLog(String id, String message, String level, Date createTime, Integer taskBlockId) {
        this.id = id;
        this.message = message;
        this.level = level;
        this.createTime = createTime;
        this.taskBlockId = taskBlockId;
    }

    public static WindTaskLogBuilder builder() {
        return new WindTaskLogBuilder();
    }

    public String getId() {
        return this.id;
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

    public Integer getTaskBlockId() {
        return this.taskBlockId;
    }

    public String getMessage() {
        return this.message;
    }

    public String getLevel() {
        return this.level;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public void setId(String id) {
        this.id = id;
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

    public void setTaskBlockId(Integer taskBlockId) {
        this.taskBlockId = taskBlockId;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskLog)) {
            return false;
        }
        WindTaskLog other = (WindTaskLog)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$taskBlockId = this.getTaskBlockId();
        Integer other$taskBlockId = other.getTaskBlockId();
        if (this$taskBlockId == null ? other$taskBlockId != null : !((Object)this$taskBlockId).equals(other$taskBlockId)) {
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
        String this$message = this.getMessage();
        String other$message = other.getMessage();
        if (this$message == null ? other$message != null : !this$message.equals(other$message)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        return !(this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskLog;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $taskBlockId = this.getTaskBlockId();
        result = result * 59 + ($taskBlockId == null ? 43 : ((Object)$taskBlockId).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskLog(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", taskId=" + this.getTaskId() + ", taskRecordId=" + this.getTaskRecordId() + ", taskBlockId=" + this.getTaskBlockId() + ", message=" + this.getMessage() + ", level=" + this.getLevel() + ", createTime=" + this.getCreateTime() + ")";
    }

    public WindTaskLog() {
    }

    public WindTaskLog(String id, String projectId, String taskId, String taskRecordId, Integer taskBlockId, String message, String level, Date createTime) {
        this.id = id;
        this.projectId = projectId;
        this.taskId = taskId;
        this.taskRecordId = taskRecordId;
        this.taskBlockId = taskBlockId;
        this.message = message;
        this.level = level;
        this.createTime = createTime;
    }
}

