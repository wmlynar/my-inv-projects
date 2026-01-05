/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ErrorHandleReq
 *  com.seer.rds.vo.req.ErrorHandleReq$ErrorHandleReqBuilder
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.ErrorHandleReq;

public class ErrorHandleReq {
    private String recordId;

    public static ErrorHandleReqBuilder builder() {
        return new ErrorHandleReqBuilder();
    }

    public String getRecordId() {
        return this.recordId;
    }

    public void setRecordId(String recordId) {
        this.recordId = recordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ErrorHandleReq)) {
            return false;
        }
        ErrorHandleReq other = (ErrorHandleReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$recordId = this.getRecordId();
        String other$recordId = other.getRecordId();
        return !(this$recordId == null ? other$recordId != null : !this$recordId.equals(other$recordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ErrorHandleReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $recordId = this.getRecordId();
        result = result * 59 + ($recordId == null ? 43 : $recordId.hashCode());
        return result;
    }

    public String toString() {
        return "ErrorHandleReq(recordId=" + this.getRecordId() + ")";
    }

    public ErrorHandleReq() {
    }

    public ErrorHandleReq(String recordId) {
        this.recordId = recordId;
    }
}

