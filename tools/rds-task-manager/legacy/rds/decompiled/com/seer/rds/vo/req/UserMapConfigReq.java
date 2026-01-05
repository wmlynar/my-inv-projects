/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.UserMapConfigReq
 */
package com.seer.rds.vo.req;

public class UserMapConfigReq {
    private String userKey;
    private String userValue;

    public String getUserKey() {
        return this.userKey;
    }

    public String getUserValue() {
        return this.userValue;
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
        if (!(o instanceof UserMapConfigReq)) {
            return false;
        }
        UserMapConfigReq other = (UserMapConfigReq)o;
        if (!other.canEqual((Object)this)) {
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
        return other instanceof UserMapConfigReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $userKey = this.getUserKey();
        result = result * 59 + ($userKey == null ? 43 : $userKey.hashCode());
        String $userValue = this.getUserValue();
        result = result * 59 + ($userValue == null ? 43 : $userValue.hashCode());
        return result;
    }

    public String toString() {
        return "UserMapConfigReq(userKey=" + this.getUserKey() + ", userValue=" + this.getUserValue() + ")";
    }

    public UserMapConfigReq withUserKey(String userKey) {
        return this.userKey == userKey ? this : new UserMapConfigReq(userKey, this.userValue);
    }

    public UserMapConfigReq withUserValue(String userValue) {
        return this.userValue == userValue ? this : new UserMapConfigReq(this.userKey, userValue);
    }

    public UserMapConfigReq(String userKey, String userValue) {
        this.userKey = userKey;
        this.userValue = userValue;
    }

    public UserMapConfigReq() {
    }
}

