/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.WindTaskDefReq
 */
package com.seer.rds.vo.req;

public class WindTaskDefReq {
    private String id;
    private String projectId;
    private Integer version;
    private String label;
    private Integer status;
    private String remark;
    private String createDate;
    private Boolean ifShowHistory;

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
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

    public String getRemark() {
        return this.remark;
    }

    public String getCreateDate() {
        return this.createDate;
    }

    public Boolean getIfShowHistory() {
        return this.ifShowHistory;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
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

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public void setIfShowHistory(Boolean ifShowHistory) {
        this.ifShowHistory = ifShowHistory;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskDefReq)) {
            return false;
        }
        WindTaskDefReq other = (WindTaskDefReq)o;
        if (!other.canEqual((Object)this)) {
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
        Boolean this$ifShowHistory = this.getIfShowHistory();
        Boolean other$ifShowHistory = other.getIfShowHistory();
        if (this$ifShowHistory == null ? other$ifShowHistory != null : !((Object)this$ifShowHistory).equals(other$ifShowHistory)) {
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
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$createDate = this.getCreateDate();
        String other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !this$createDate.equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskDefReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Boolean $ifShowHistory = this.getIfShowHistory();
        result = result * 59 + ($ifShowHistory == null ? 43 : ((Object)$ifShowHistory).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : $createDate.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskDefReq(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", version=" + this.getVersion() + ", label=" + this.getLabel() + ", status=" + this.getStatus() + ", remark=" + this.getRemark() + ", createDate=" + this.getCreateDate() + ", ifShowHistory=" + this.getIfShowHistory() + ")";
    }
}

