/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.EventDefExport
 */
package com.seer.rds.vo.response;

import java.io.Serializable;
import java.util.Date;

public class EventDefExport
implements Serializable {
    private String id;
    private String projectId;
    private Date createDate;
    private String label;
    private Boolean ifEnable;
    private String msg;
    private String detail;

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public String getLabel() {
        return this.label;
    }

    public Boolean getIfEnable() {
        return this.ifEnable;
    }

    public String getMsg() {
        return this.msg;
    }

    public String getDetail() {
        return this.detail;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setIfEnable(Boolean ifEnable) {
        this.ifEnable = ifEnable;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EventDefExport)) {
            return false;
        }
        EventDefExport other = (EventDefExport)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifEnable = this.getIfEnable();
        Boolean other$ifEnable = other.getIfEnable();
        if (this$ifEnable == null ? other$ifEnable != null : !((Object)this$ifEnable).equals(other$ifEnable)) {
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
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$msg = this.getMsg();
        String other$msg = other.getMsg();
        if (this$msg == null ? other$msg != null : !this$msg.equals(other$msg)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        return !(this$detail == null ? other$detail != null : !this$detail.equals(other$detail));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EventDefExport;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifEnable = this.getIfEnable();
        result = result * 59 + ($ifEnable == null ? 43 : ((Object)$ifEnable).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $msg = this.getMsg();
        result = result * 59 + ($msg == null ? 43 : $msg.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        return result;
    }

    public String toString() {
        return "EventDefExport(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", createDate=" + this.getCreateDate() + ", label=" + this.getLabel() + ", ifEnable=" + this.getIfEnable() + ", msg=" + this.getMsg() + ", detail=" + this.getDetail() + ")";
    }
}

