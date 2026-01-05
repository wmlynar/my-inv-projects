/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.WindTaskLogResp
 */
package com.seer.rds.vo.response;

public class WindTaskLogResp {
    private String id;
    private String message;
    private String level;
    private String createTime;
    private Integer taskBlockId;

    public String getId() {
        return this.id;
    }

    public String getMessage() {
        return this.message;
    }

    public String getLevel() {
        return this.level;
    }

    public String getCreateTime() {
        return this.createTime;
    }

    public Integer getTaskBlockId() {
        return this.taskBlockId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setCreateTime(String createTime) {
        this.createTime = createTime;
    }

    public void setTaskBlockId(Integer taskBlockId) {
        this.taskBlockId = taskBlockId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskLogResp)) {
            return false;
        }
        WindTaskLogResp other = (WindTaskLogResp)o;
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
        String this$createTime = this.getCreateTime();
        String other$createTime = other.getCreateTime();
        return !(this$createTime == null ? other$createTime != null : !this$createTime.equals(other$createTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskLogResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $taskBlockId = this.getTaskBlockId();
        result = result * 59 + ($taskBlockId == null ? 43 : ((Object)$taskBlockId).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        String $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : $createTime.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskLogResp(id=" + this.getId() + ", message=" + this.getMessage() + ", level=" + this.getLevel() + ", createTime=" + this.getCreateTime() + ", taskBlockId=" + this.getTaskBlockId() + ")";
    }
}

