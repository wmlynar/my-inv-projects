/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.AttrAgvDeleteReq
 */
package com.seer.rds.vo.req;

import java.io.Serializable;

public class AttrAgvDeleteReq
implements Serializable {
    private String agvName;

    public String getAgvName() {
        return this.agvName;
    }

    public void setAgvName(String agvName) {
        this.agvName = agvName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AttrAgvDeleteReq)) {
            return false;
        }
        AttrAgvDeleteReq other = (AttrAgvDeleteReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$agvName = this.getAgvName();
        String other$agvName = other.getAgvName();
        return !(this$agvName == null ? other$agvName != null : !this$agvName.equals(other$agvName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AttrAgvDeleteReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $agvName = this.getAgvName();
        result = result * 59 + ($agvName == null ? 43 : $agvName.hashCode());
        return result;
    }

    public String toString() {
        return "AttrAgvDeleteReq(agvName=" + this.getAgvName() + ")";
    }
}

