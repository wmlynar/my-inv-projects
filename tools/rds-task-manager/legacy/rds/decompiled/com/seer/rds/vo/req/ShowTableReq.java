/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ShowTableReq
 */
package com.seer.rds.vo.req;

import java.io.Serializable;
import java.util.Map;

public class ShowTableReq
implements Serializable {
    private String id = "";
    private Map<String, Object> params = null;

    public String getId() {
        return this.id;
    }

    public Map<String, Object> getParams() {
        return this.params;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setParams(Map<String, Object> params) {
        this.params = params;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ShowTableReq)) {
            return false;
        }
        ShowTableReq other = (ShowTableReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Map this$params = this.getParams();
        Map other$params = other.getParams();
        return !(this$params == null ? other$params != null : !((Object)this$params).equals(other$params));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ShowTableReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Map $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : ((Object)$params).hashCode());
        return result;
    }

    public String toString() {
        return "ShowTableReq(id=" + this.getId() + ", params=" + this.getParams() + ")";
    }
}

