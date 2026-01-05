/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.SysLog
 *  com.seer.rds.model.admin.SysLog$SysLogBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.admin;

import com.seer.rds.model.admin.SysLog;
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
@Table(name="t_syslog", indexes={@Index(name="idxSlLevelIndex", columnList="level"), @Index(name="idxSlCreateDateIndex", columnList="createDate"), @Index(name="idxSlOprUserIndex", columnList="oprUser")})
public class SysLog {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(name="\"level\"")
    private String level;
    private String operation;
    @Lob
    private String message;
    private String enMessage;
    private String oprUser;
    private Date createDate;

    public static SysLogBuilder builder() {
        return new SysLogBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getLevel() {
        return this.level;
    }

    public String getOperation() {
        return this.operation;
    }

    public String getMessage() {
        return this.message;
    }

    public String getEnMessage() {
        return this.enMessage;
    }

    public String getOprUser() {
        return this.oprUser;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setEnMessage(String enMessage) {
        this.enMessage = enMessage;
    }

    public void setOprUser(String oprUser) {
        this.oprUser = oprUser;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SysLog)) {
            return false;
        }
        SysLog other = (SysLog)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        if (this$level == null ? other$level != null : !this$level.equals(other$level)) {
            return false;
        }
        String this$operation = this.getOperation();
        String other$operation = other.getOperation();
        if (this$operation == null ? other$operation != null : !this$operation.equals(other$operation)) {
            return false;
        }
        String this$message = this.getMessage();
        String other$message = other.getMessage();
        if (this$message == null ? other$message != null : !this$message.equals(other$message)) {
            return false;
        }
        String this$enMessage = this.getEnMessage();
        String other$enMessage = other.getEnMessage();
        if (this$enMessage == null ? other$enMessage != null : !this$enMessage.equals(other$enMessage)) {
            return false;
        }
        String this$oprUser = this.getOprUser();
        String other$oprUser = other.getOprUser();
        if (this$oprUser == null ? other$oprUser != null : !this$oprUser.equals(other$oprUser)) {
            return false;
        }
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SysLog;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $operation = this.getOperation();
        result = result * 59 + ($operation == null ? 43 : $operation.hashCode());
        String $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        String $enMessage = this.getEnMessage();
        result = result * 59 + ($enMessage == null ? 43 : $enMessage.hashCode());
        String $oprUser = this.getOprUser();
        result = result * 59 + ($oprUser == null ? 43 : $oprUser.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        return result;
    }

    public String toString() {
        return "SysLog(id=" + this.getId() + ", level=" + this.getLevel() + ", operation=" + this.getOperation() + ", message=" + this.getMessage() + ", enMessage=" + this.getEnMessage() + ", oprUser=" + this.getOprUser() + ", createDate=" + this.getCreateDate() + ")";
    }

    public SysLog(String id, String level, String operation, String message, String enMessage, String oprUser, Date createDate) {
        this.id = id;
        this.level = level;
        this.operation = operation;
        this.message = message;
        this.enMessage = enMessage;
        this.oprUser = oprUser;
        this.createDate = createDate;
    }

    public SysLog() {
    }
}

