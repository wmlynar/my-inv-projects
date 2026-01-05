/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseErrorHandle
 *  com.seer.rds.model.wind.TaskErrorHandle
 *  com.seer.rds.model.wind.TaskErrorHandle$TaskErrorHandleBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.BaseErrorHandle;
import com.seer.rds.model.wind.TaskErrorHandle;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_errorHandle")
public class TaskErrorHandle
extends BaseErrorHandle {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private Integer status;
    private String recordId;
    private Long duration;

    public static TaskErrorHandleBuilder builder() {
        return new TaskErrorHandleBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getRecordId() {
        return this.recordId;
    }

    public Long getDuration() {
        return this.duration;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setRecordId(String recordId) {
        this.recordId = recordId;
    }

    public void setDuration(Long duration) {
        this.duration = duration;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskErrorHandle)) {
            return false;
        }
        TaskErrorHandle other = (TaskErrorHandle)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Long this$duration = this.getDuration();
        Long other$duration = other.getDuration();
        if (this$duration == null ? other$duration != null : !((Object)this$duration).equals(other$duration)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$recordId = this.getRecordId();
        String other$recordId = other.getRecordId();
        return !(this$recordId == null ? other$recordId != null : !this$recordId.equals(other$recordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskErrorHandle;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Long $duration = this.getDuration();
        result = result * 59 + ($duration == null ? 43 : ((Object)$duration).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $recordId = this.getRecordId();
        result = result * 59 + ($recordId == null ? 43 : $recordId.hashCode());
        return result;
    }

    public String toString() {
        return "TaskErrorHandle(id=" + this.getId() + ", status=" + this.getStatus() + ", recordId=" + this.getRecordId() + ", duration=" + this.getDuration() + ")";
    }

    public TaskErrorHandle() {
    }

    public TaskErrorHandle(String id, Integer status, String recordId, Long duration) {
        this.id = id;
        this.status = status;
        this.recordId = recordId;
        this.duration = duration;
    }
}

