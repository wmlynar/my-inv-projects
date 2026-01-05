/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.UserConfigRecordReq
 */
package com.seer.rds.vo.req;

public class UserConfigRecordReq {
    private String userId;
    private String userKey;
    private String userValue;

    public String getUserId() {
        return this.userId;
    }

    public String getUserKey() {
        return this.userKey;
    }

    public String getUserValue() {
        return this.userValue;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setUserKey(String userKey) {
        this.userKey = userKey;
    }

    public void setUserValue(String userValue) {
        this.userValue = userValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UserConfigRecordReq)) {
            return false;
        }
        UserConfigRecordReq other = (UserConfigRecordReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$userId = this.getUserId();
        String other$userId = other.getUserId();
        if (this$userId == null ? other$userId != null : !this$userId.equals(other$userId)) {
            return false;
        }
        String this$userKey = this.getUserKey();
        String other$userKey = other.getUserKey();
        if (this$userKey == null ? other$userKey != null : !this$userKey.equals(other$userKey)) {
            return false;
        }
        String this$userValue = this.getUserValue();
        String other$userValue = other.getUserValue();
        return !(this$userValue == null ? other$userValue != null : !this$userValue.equals(other$userValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UserConfigRecordReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $userId = this.getUserId();
        result = result * 59 + ($userId == null ? 43 : $userId.hashCode());
        String $userKey = this.getUserKey();
        result = result * 59 + ($userKey == null ? 43 : $userKey.hashCode());
        String $userValue = this.getUserValue();
        result = result * 59 + ($userValue == null ? 43 : $userValue.hashCode());
        return result;
    }

    public String toString() {
        return "UserConfigRecordReq(userId=" + this.getUserId() + ", userKey=" + this.getUserKey() + ", userValue=" + this.getUserValue() + ")";
    }

    public UserConfigRecordReq withUserId(String userId) {
        return this.userId == userId ? this : new UserConfigRecordReq(userId, this.userKey, this.userValue);
    }

    public UserConfigRecordReq withUserKey(String userKey) {
        return this.userKey == userKey ? this : new UserConfigRecordReq(this.userId, userKey, this.userValue);
    }

    public UserConfigRecordReq withUserValue(String userValue) {
        return this.userValue == userValue ? this : new UserConfigRecordReq(this.userId, this.userKey, userValue);
    }

    public UserConfigRecordReq(String userId, String userKey, String userValue) {
        this.userId = userId;
        this.userKey = userKey;
        this.userValue = userValue;
    }

    public UserConfigRecordReq() {
    }
}

