/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.model.admin.UserConfigRecord$UserConfigRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.admin;

import com.seer.rds.model.admin.UserConfigRecord;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_userconfigrecord")
public class UserConfigRecord {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String userId;
    private String userKey;
    @Lob
    private String userValue;

    public static UserConfigRecordBuilder builder() {
        return new UserConfigRecordBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getUserId() {
        return this.userId;
    }

    public String getUserKey() {
        return this.userKey;
    }

    public String getUserValue() {
        return this.userValue;
    }

    public void setId(String id) {
        this.id = id;
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
        if (!(o instanceof UserConfigRecord)) {
            return false;
        }
        UserConfigRecord other = (UserConfigRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
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
        return other instanceof UserConfigRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $userId = this.getUserId();
        result = result * 59 + ($userId == null ? 43 : $userId.hashCode());
        String $userKey = this.getUserKey();
        result = result * 59 + ($userKey == null ? 43 : $userKey.hashCode());
        String $userValue = this.getUserValue();
        result = result * 59 + ($userValue == null ? 43 : $userValue.hashCode());
        return result;
    }

    public String toString() {
        return "UserConfigRecord(id=" + this.getId() + ", userId=" + this.getUserId() + ", userKey=" + this.getUserKey() + ", userValue=" + this.getUserValue() + ")";
    }

    public UserConfigRecord() {
    }

    public UserConfigRecord(String id, String userId, String userKey, String userValue) {
        this.id = id;
        this.userId = userId;
        this.userKey = userKey;
        this.userValue = userValue;
    }
}

