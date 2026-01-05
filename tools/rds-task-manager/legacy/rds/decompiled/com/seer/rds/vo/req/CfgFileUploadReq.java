/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.CfgFileUploadReq
 */
package com.seer.rds.vo.req;

public class CfgFileUploadReq {
    private String dataString;

    public String getDataString() {
        return this.dataString;
    }

    public void setDataString(String dataString) {
        this.dataString = dataString;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CfgFileUploadReq)) {
            return false;
        }
        CfgFileUploadReq other = (CfgFileUploadReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$dataString = this.getDataString();
        String other$dataString = other.getDataString();
        return !(this$dataString == null ? other$dataString != null : !this$dataString.equals(other$dataString));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CfgFileUploadReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $dataString = this.getDataString();
        result = result * 59 + ($dataString == null ? 43 : $dataString.hashCode());
        return result;
    }

    public String toString() {
        return "CfgFileUploadReq(dataString=" + this.getDataString() + ")";
    }
}

