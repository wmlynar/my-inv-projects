/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.BatchOperateWorkSiteReq
 */
package com.seer.rds.vo.req;

import java.util.List;

public class BatchOperateWorkSiteReq {
    List<String> workSiteIds;
    String label;
    String number;
    String content;
    String workSiteName;

    public List<String> getWorkSiteIds() {
        return this.workSiteIds;
    }

    public String getLabel() {
        return this.label;
    }

    public String getNumber() {
        return this.number;
    }

    public String getContent() {
        return this.content;
    }

    public String getWorkSiteName() {
        return this.workSiteName;
    }

    public void setWorkSiteIds(List<String> workSiteIds) {
        this.workSiteIds = workSiteIds;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setNumber(String number) {
        this.number = number;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setWorkSiteName(String workSiteName) {
        this.workSiteName = workSiteName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BatchOperateWorkSiteReq)) {
            return false;
        }
        BatchOperateWorkSiteReq other = (BatchOperateWorkSiteReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$workSiteIds = this.getWorkSiteIds();
        List other$workSiteIds = other.getWorkSiteIds();
        if (this$workSiteIds == null ? other$workSiteIds != null : !((Object)this$workSiteIds).equals(other$workSiteIds)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$number = this.getNumber();
        String other$number = other.getNumber();
        if (this$number == null ? other$number != null : !this$number.equals(other$number)) {
            return false;
        }
        String this$content = this.getContent();
        String other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        String this$workSiteName = this.getWorkSiteName();
        String other$workSiteName = other.getWorkSiteName();
        return !(this$workSiteName == null ? other$workSiteName != null : !this$workSiteName.equals(other$workSiteName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BatchOperateWorkSiteReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $workSiteIds = this.getWorkSiteIds();
        result = result * 59 + ($workSiteIds == null ? 43 : ((Object)$workSiteIds).hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $number = this.getNumber();
        result = result * 59 + ($number == null ? 43 : $number.hashCode());
        String $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        String $workSiteName = this.getWorkSiteName();
        result = result * 59 + ($workSiteName == null ? 43 : $workSiteName.hashCode());
        return result;
    }

    public String toString() {
        return "BatchOperateWorkSiteReq(workSiteIds=" + this.getWorkSiteIds() + ", label=" + this.getLabel() + ", number=" + this.getNumber() + ", content=" + this.getContent() + ", workSiteName=" + this.getWorkSiteName() + ")";
    }
}

