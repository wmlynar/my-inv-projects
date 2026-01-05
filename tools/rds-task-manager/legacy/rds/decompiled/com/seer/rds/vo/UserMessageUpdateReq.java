/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.UserMessageUpdateReq
 *  com.seer.rds.vo.UserMessageUpdateReq$UserMessageUpdateReqBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.UserMessageUpdateReq;

public class UserMessageUpdateReq {
    private String messageId;
    private Integer ifRead;

    public static UserMessageUpdateReqBuilder builder() {
        return new UserMessageUpdateReqBuilder();
    }

    public String getMessageId() {
        return this.messageId;
    }

    public Integer getIfRead() {
        return this.ifRead;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    public void setIfRead(Integer ifRead) {
        this.ifRead = ifRead;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UserMessageUpdateReq)) {
            return false;
        }
        UserMessageUpdateReq other = (UserMessageUpdateReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$ifRead = this.getIfRead();
        Integer other$ifRead = other.getIfRead();
        if (this$ifRead == null ? other$ifRead != null : !((Object)this$ifRead).equals(other$ifRead)) {
            return false;
        }
        String this$messageId = this.getMessageId();
        String other$messageId = other.getMessageId();
        return !(this$messageId == null ? other$messageId != null : !this$messageId.equals(other$messageId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UserMessageUpdateReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $ifRead = this.getIfRead();
        result = result * 59 + ($ifRead == null ? 43 : ((Object)$ifRead).hashCode());
        String $messageId = this.getMessageId();
        result = result * 59 + ($messageId == null ? 43 : $messageId.hashCode());
        return result;
    }

    public String toString() {
        return "UserMessageUpdateReq(messageId=" + this.getMessageId() + ", ifRead=" + this.getIfRead() + ")";
    }

    public UserMessageUpdateReq() {
    }

    public UserMessageUpdateReq(String messageId, Integer ifRead) {
        this.messageId = messageId;
        this.ifRead = ifRead;
    }
}

