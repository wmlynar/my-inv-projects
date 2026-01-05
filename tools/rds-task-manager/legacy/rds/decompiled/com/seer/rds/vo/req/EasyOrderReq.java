/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.EasyOrderReq
 */
package com.seer.rds.vo.req;

public class EasyOrderReq {
    private String menuId = "";
    private Object params = null;
    private String callWorkType = "";
    private String callWorkStation = "";

    public String getMenuId() {
        return this.menuId;
    }

    public Object getParams() {
        return this.params;
    }

    public String getCallWorkType() {
        return this.callWorkType;
    }

    public String getCallWorkStation() {
        return this.callWorkStation;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setParams(Object params) {
        this.params = params;
    }

    public void setCallWorkType(String callWorkType) {
        this.callWorkType = callWorkType;
    }

    public void setCallWorkStation(String callWorkStation) {
        this.callWorkStation = callWorkStation;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EasyOrderReq)) {
            return false;
        }
        EasyOrderReq other = (EasyOrderReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        Object this$params = this.getParams();
        Object other$params = other.getParams();
        if (this$params == null ? other$params != null : !this$params.equals(other$params)) {
            return false;
        }
        String this$callWorkType = this.getCallWorkType();
        String other$callWorkType = other.getCallWorkType();
        if (this$callWorkType == null ? other$callWorkType != null : !this$callWorkType.equals(other$callWorkType)) {
            return false;
        }
        String this$callWorkStation = this.getCallWorkStation();
        String other$callWorkStation = other.getCallWorkStation();
        return !(this$callWorkStation == null ? other$callWorkStation != null : !this$callWorkStation.equals(other$callWorkStation));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EasyOrderReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        Object $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : $params.hashCode());
        String $callWorkType = this.getCallWorkType();
        result = result * 59 + ($callWorkType == null ? 43 : $callWorkType.hashCode());
        String $callWorkStation = this.getCallWorkStation();
        result = result * 59 + ($callWorkStation == null ? 43 : $callWorkStation.hashCode());
        return result;
    }

    public String toString() {
        return "EasyOrderReq(menuId=" + this.getMenuId() + ", params=" + this.getParams() + ", callWorkType=" + this.getCallWorkType() + ", callWorkStation=" + this.getCallWorkStation() + ")";
    }
}

