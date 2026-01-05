/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.req.DemandSaveParam
 */
package com.seer.rds.vo.req;

import com.alibaba.fastjson.JSONObject;

public class DemandSaveParam {
    private String demandId;
    private JSONObject supplementContent;

    public String getDemandId() {
        return this.demandId;
    }

    public JSONObject getSupplementContent() {
        return this.supplementContent;
    }

    public void setDemandId(String demandId) {
        this.demandId = demandId;
    }

    public void setSupplementContent(JSONObject supplementContent) {
        this.supplementContent = supplementContent;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandSaveParam)) {
            return false;
        }
        DemandSaveParam other = (DemandSaveParam)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$demandId = this.getDemandId();
        String other$demandId = other.getDemandId();
        if (this$demandId == null ? other$demandId != null : !this$demandId.equals(other$demandId)) {
            return false;
        }
        JSONObject this$supplementContent = this.getSupplementContent();
        JSONObject other$supplementContent = other.getSupplementContent();
        return !(this$supplementContent == null ? other$supplementContent != null : !this$supplementContent.equals(other$supplementContent));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandSaveParam;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $demandId = this.getDemandId();
        result = result * 59 + ($demandId == null ? 43 : $demandId.hashCode());
        JSONObject $supplementContent = this.getSupplementContent();
        result = result * 59 + ($supplementContent == null ? 43 : $supplementContent.hashCode());
        return result;
    }

    public String toString() {
        return "DemandSaveParam(demandId=" + this.getDemandId() + ", supplementContent=" + this.getSupplementContent() + ")";
    }
}

