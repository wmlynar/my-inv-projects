/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.WindTaskDefResp
 */
package com.seer.rds.vo.response;

import java.io.Serializable;

public class WindTaskDefResp
implements Serializable {
    private String id;
    private String projectId;
    private String detail;
    private Integer version;
    private String label;
    private Integer status;
    private String createDate;
    private String remark;
    private String templateDescription;
    private String templateName;
    private Integer periodicTask;
    private Integer ifEnable;
    private long period;
    private long delay;
    private Long windcategoryId;
    private Boolean releaseSites;

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public String getDetail() {
        return this.detail;
    }

    public Integer getVersion() {
        return this.version;
    }

    public String getLabel() {
        return this.label;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getCreateDate() {
        return this.createDate;
    }

    public String getRemark() {
        return this.remark;
    }

    public String getTemplateDescription() {
        return this.templateDescription;
    }

    public String getTemplateName() {
        return this.templateName;
    }

    public Integer getPeriodicTask() {
        return this.periodicTask;
    }

    public Integer getIfEnable() {
        return this.ifEnable;
    }

    public long getPeriod() {
        return this.period;
    }

    public long getDelay() {
        return this.delay;
    }

    public Long getWindcategoryId() {
        return this.windcategoryId;
    }

    public Boolean getReleaseSites() {
        return this.releaseSites;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setTemplateDescription(String templateDescription) {
        this.templateDescription = templateDescription;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public void setPeriodicTask(Integer periodicTask) {
        this.periodicTask = periodicTask;
    }

    public void setIfEnable(Integer ifEnable) {
        this.ifEnable = ifEnable;
    }

    public void setPeriod(long period) {
        this.period = period;
    }

    public void setDelay(long delay) {
        this.delay = delay;
    }

    public void setWindcategoryId(Long windcategoryId) {
        this.windcategoryId = windcategoryId;
    }

    public void setReleaseSites(Boolean releaseSites) {
        this.releaseSites = releaseSites;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskDefResp)) {
            return false;
        }
        WindTaskDefResp other = (WindTaskDefResp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getPeriod() != other.getPeriod()) {
            return false;
        }
        if (this.getDelay() != other.getDelay()) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Integer this$periodicTask = this.getPeriodicTask();
        Integer other$periodicTask = other.getPeriodicTask();
        if (this$periodicTask == null ? other$periodicTask != null : !((Object)this$periodicTask).equals(other$periodicTask)) {
            return false;
        }
        Integer this$ifEnable = this.getIfEnable();
        Integer other$ifEnable = other.getIfEnable();
        if (this$ifEnable == null ? other$ifEnable != null : !((Object)this$ifEnable).equals(other$ifEnable)) {
            return false;
        }
        Long this$windcategoryId = this.getWindcategoryId();
        Long other$windcategoryId = other.getWindcategoryId();
        if (this$windcategoryId == null ? other$windcategoryId != null : !((Object)this$windcategoryId).equals(other$windcategoryId)) {
            return false;
        }
        Boolean this$releaseSites = this.getReleaseSites();
        Boolean other$releaseSites = other.getReleaseSites();
        if (this$releaseSites == null ? other$releaseSites != null : !((Object)this$releaseSites).equals(other$releaseSites)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        if (this$detail == null ? other$detail != null : !this$detail.equals(other$detail)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$createDate = this.getCreateDate();
        String other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !this$createDate.equals(other$createDate)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$templateDescription = this.getTemplateDescription();
        String other$templateDescription = other.getTemplateDescription();
        if (this$templateDescription == null ? other$templateDescription != null : !this$templateDescription.equals(other$templateDescription)) {
            return false;
        }
        String this$templateName = this.getTemplateName();
        String other$templateName = other.getTemplateName();
        return !(this$templateName == null ? other$templateName != null : !this$templateName.equals(other$templateName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskDefResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        long $period = this.getPeriod();
        result = result * 59 + (int)($period >>> 32 ^ $period);
        long $delay = this.getDelay();
        result = result * 59 + (int)($delay >>> 32 ^ $delay);
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Integer $periodicTask = this.getPeriodicTask();
        result = result * 59 + ($periodicTask == null ? 43 : ((Object)$periodicTask).hashCode());
        Integer $ifEnable = this.getIfEnable();
        result = result * 59 + ($ifEnable == null ? 43 : ((Object)$ifEnable).hashCode());
        Long $windcategoryId = this.getWindcategoryId();
        result = result * 59 + ($windcategoryId == null ? 43 : ((Object)$windcategoryId).hashCode());
        Boolean $releaseSites = this.getReleaseSites();
        result = result * 59 + ($releaseSites == null ? 43 : ((Object)$releaseSites).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : $createDate.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $templateDescription = this.getTemplateDescription();
        result = result * 59 + ($templateDescription == null ? 43 : $templateDescription.hashCode());
        String $templateName = this.getTemplateName();
        result = result * 59 + ($templateName == null ? 43 : $templateName.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskDefResp(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", detail=" + this.getDetail() + ", version=" + this.getVersion() + ", label=" + this.getLabel() + ", status=" + this.getStatus() + ", createDate=" + this.getCreateDate() + ", remark=" + this.getRemark() + ", templateDescription=" + this.getTemplateDescription() + ", templateName=" + this.getTemplateName() + ", periodicTask=" + this.getPeriodicTask() + ", ifEnable=" + this.getIfEnable() + ", period=" + this.getPeriod() + ", delay=" + this.getDelay() + ", windcategoryId=" + this.getWindcategoryId() + ", releaseSites=" + this.getReleaseSites() + ")";
    }
}

