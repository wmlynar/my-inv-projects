/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.taskIdListReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class taskIdListReq {
    private List<String> idLists;

    public List<String> getIdLists() {
        return this.idLists;
    }

    public void setIdLists(List<String> idLists) {
        this.idLists = idLists;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof taskIdListReq)) {
            return false;
        }
        taskIdListReq other = (taskIdListReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$idLists = this.getIdLists();
        List other$idLists = other.getIdLists();
        return !(this$idLists == null ? other$idLists != null : !((Object)this$idLists).equals(other$idLists));
    }

    protected boolean canEqual(Object other) {
        return other instanceof taskIdListReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $idLists = this.getIdLists();
        result = result * 59 + ($idLists == null ? 43 : ((Object)$idLists).hashCode());
        return result;
    }

    public String toString() {
        return "taskIdListReq(idLists=" + this.getIdLists() + ")";
    }
}

