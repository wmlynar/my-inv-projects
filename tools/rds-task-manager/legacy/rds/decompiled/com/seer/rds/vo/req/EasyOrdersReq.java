/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.EasyOrdersReq
 */
package com.seer.rds.vo.req;

import java.util.Collections;
import java.util.List;

@Deprecated
public class EasyOrdersReq {
    private List<String> taskLabels = Collections.emptyList();

    public List<String> getTaskLabels() {
        return this.taskLabels;
    }

    public void setTaskLabels(List<String> taskLabels) {
        this.taskLabels = taskLabels;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EasyOrdersReq)) {
            return false;
        }
        EasyOrdersReq other = (EasyOrdersReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$taskLabels = this.getTaskLabels();
        List other$taskLabels = other.getTaskLabels();
        return !(this$taskLabels == null ? other$taskLabels != null : !((Object)this$taskLabels).equals(other$taskLabels));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EasyOrdersReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $taskLabels = this.getTaskLabels();
        result = result * 59 + ($taskLabels == null ? 43 : ((Object)$taskLabels).hashCode());
        return result;
    }

    public String toString() {
        return "EasyOrdersReq(taskLabels=" + this.getTaskLabels() + ")";
    }
}

