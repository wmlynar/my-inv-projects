/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.DistributeVo
 */
package com.seer.rds.vo;

public class DistributeVo {
    private String toLoc;
    private String postAction;

    public String getToLoc() {
        return this.toLoc;
    }

    public String getPostAction() {
        return this.postAction;
    }

    public void setToLoc(String toLoc) {
        this.toLoc = toLoc;
    }

    public void setPostAction(String postAction) {
        this.postAction = postAction;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DistributeVo)) {
            return false;
        }
        DistributeVo other = (DistributeVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$toLoc = this.getToLoc();
        String other$toLoc = other.getToLoc();
        if (this$toLoc == null ? other$toLoc != null : !this$toLoc.equals(other$toLoc)) {
            return false;
        }
        String this$postAction = this.getPostAction();
        String other$postAction = other.getPostAction();
        return !(this$postAction == null ? other$postAction != null : !this$postAction.equals(other$postAction));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DistributeVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $toLoc = this.getToLoc();
        result = result * 59 + ($toLoc == null ? 43 : $toLoc.hashCode());
        String $postAction = this.getPostAction();
        result = result * 59 + ($postAction == null ? 43 : $postAction.hashCode());
        return result;
    }

    public String toString() {
        return "DistributeVo(toLoc=" + this.getToLoc() + ", postAction=" + this.getPostAction() + ")";
    }
}

