/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.SystemLogResp
 */
package com.seer.rds.vo.response;

import java.util.Date;

public class SystemLogResp {
    private String id;
    private String level;
    private String operation;
    private String message;
    private String oprUser;
    private Date createDate;

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
        if (!(o instanceof SystemLogResp)) {
            return false;
        }
        SystemLogResp other = (SystemLogResp)o;
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
        return other instanceof SystemLogResp;
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
        String $oprUser = this.getOprUser();
        result = result * 59 + ($oprUser == null ? 43 : $oprUser.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        return result;
    }

    public String toString() {
        return "SystemLogResp(id=" + this.getId() + ", level=" + this.getLevel() + ", operation=" + this.getOperation() + ", message=" + this.getMessage() + ", oprUser=" + this.getOprUser() + ", createDate=" + this.getCreateDate() + ")";
    }
}

