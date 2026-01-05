/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.QueryWindTaskDefReq
 */
package com.seer.rds.vo.req;

public class QueryWindTaskDefReq {
    private String id;

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof QueryWindTaskDefReq)) {
            return false;
        }
        QueryWindTaskDefReq other = (QueryWindTaskDefReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        return !(this$id == null ? other$id != null : !this$id.equals(other$id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof QueryWindTaskDefReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "QueryWindTaskDefReq(id=" + this.getId() + ")";
    }
}

