/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseErrorHandle
 *  javax.persistence.MappedSuperclass
 */
package com.seer.rds.model.wind;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.MappedSuperclass;

@MappedSuperclass
public class BaseErrorHandle
implements Serializable {
    private static final long serialVersionUID = 1L;
    protected Boolean ifShow = true;
    protected String errorMsg;
    protected String errorId;
    protected Date createdOn;

    public Boolean getIfShow() {
        return this.ifShow;
    }

    public String getErrorMsg() {
        return this.errorMsg;
    }

    public String getErrorId() {
        return this.errorId;
    }

    public Date getCreatedOn() {
        return this.createdOn;
    }

    public void setIfShow(Boolean ifShow) {
        this.ifShow = ifShow;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public void setErrorId(String errorId) {
        this.errorId = errorId;
    }

    public void setCreatedOn(Date createdOn) {
        this.createdOn = createdOn;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BaseErrorHandle)) {
            return false;
        }
        BaseErrorHandle other = (BaseErrorHandle)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifShow = this.getIfShow();
        Boolean other$ifShow = other.getIfShow();
        if (this$ifShow == null ? other$ifShow != null : !((Object)this$ifShow).equals(other$ifShow)) {
            return false;
        }
        String this$errorMsg = this.getErrorMsg();
        String other$errorMsg = other.getErrorMsg();
        if (this$errorMsg == null ? other$errorMsg != null : !this$errorMsg.equals(other$errorMsg)) {
            return false;
        }
        String this$errorId = this.getErrorId();
        String other$errorId = other.getErrorId();
        if (this$errorId == null ? other$errorId != null : !this$errorId.equals(other$errorId)) {
            return false;
        }
        Date this$createdOn = this.getCreatedOn();
        Date other$createdOn = other.getCreatedOn();
        return !(this$createdOn == null ? other$createdOn != null : !((Object)this$createdOn).equals(other$createdOn));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BaseErrorHandle;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifShow = this.getIfShow();
        result = result * 59 + ($ifShow == null ? 43 : ((Object)$ifShow).hashCode());
        String $errorMsg = this.getErrorMsg();
        result = result * 59 + ($errorMsg == null ? 43 : $errorMsg.hashCode());
        String $errorId = this.getErrorId();
        result = result * 59 + ($errorId == null ? 43 : $errorId.hashCode());
        Date $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : ((Object)$createdOn).hashCode());
        return result;
    }

    public String toString() {
        return "BaseErrorHandle(ifShow=" + this.getIfShow() + ", errorMsg=" + this.getErrorMsg() + ", errorId=" + this.getErrorId() + ", createdOn=" + this.getCreatedOn() + ")";
    }

    public BaseErrorHandle() {
    }

    public BaseErrorHandle(Boolean ifShow, String errorMsg, String errorId, Date createdOn) {
        this.ifShow = ifShow;
        this.errorMsg = errorMsg;
        this.errorId = errorId;
        this.createdOn = createdOn;
    }
}

