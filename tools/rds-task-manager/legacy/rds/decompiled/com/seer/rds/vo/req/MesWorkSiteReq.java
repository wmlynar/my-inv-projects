/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.req.MesWorkSiteReq
 *  com.seer.rds.vo.req.MesWorkSiteReq$MesWorkSiteReqBuilder
 */
package com.seer.rds.vo.req;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.vo.req.MesWorkSiteReq;

public class MesWorkSiteReq {
    private JSONObject workSite;

    public static MesWorkSiteReqBuilder builder() {
        return new MesWorkSiteReqBuilder();
    }

    public JSONObject getWorkSite() {
        return this.workSite;
    }

    public void setWorkSite(JSONObject workSite) {
        this.workSite = workSite;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MesWorkSiteReq)) {
            return false;
        }
        MesWorkSiteReq other = (MesWorkSiteReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        JSONObject this$workSite = this.getWorkSite();
        JSONObject other$workSite = other.getWorkSite();
        return !(this$workSite == null ? other$workSite != null : !this$workSite.equals(other$workSite));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MesWorkSiteReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        JSONObject $workSite = this.getWorkSite();
        result = result * 59 + ($workSite == null ? 43 : $workSite.hashCode());
        return result;
    }

    public String toString() {
        return "MesWorkSiteReq(workSite=" + this.getWorkSite() + ")";
    }

    public MesWorkSiteReq() {
    }

    public MesWorkSiteReq(JSONObject workSite) {
        this.workSite = workSite;
    }
}

