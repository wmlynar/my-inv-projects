/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.InterfaceDefExport
 */
package com.seer.rds.vo.response;

import java.io.Serializable;
import java.util.Date;

public class InterfaceDefExport
implements Serializable {
    private String id;
    private String url;
    private String method;
    private Date createDate;
    private String projectId;
    private Integer pda;
    private String taskDefLabel;
    private String detail;

    public String getId() {
        return this.id;
    }

    public String getUrl() {
        return this.url;
    }

    public String getMethod() {
        return this.method;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public Integer getPda() {
        return this.pda;
    }

    public String getTaskDefLabel() {
        return this.taskDefLabel;
    }

    public String getDetail() {
        return this.detail;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setPda(Integer pda) {
        this.pda = pda;
    }

    public void setTaskDefLabel(String taskDefLabel) {
        this.taskDefLabel = taskDefLabel;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof InterfaceDefExport)) {
            return false;
        }
        InterfaceDefExport other = (InterfaceDefExport)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$pda = this.getPda();
        Integer other$pda = other.getPda();
        if (this$pda == null ? other$pda != null : !((Object)this$pda).equals(other$pda)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$url = this.getUrl();
        String other$url = other.getUrl();
        if (this$url == null ? other$url != null : !this$url.equals(other$url)) {
            return false;
        }
        String this$method = this.getMethod();
        String other$method = other.getMethod();
        if (this$method == null ? other$method != null : !this$method.equals(other$method)) {
            return false;
        }
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
            return false;
        }
        String this$taskDefLabel = this.getTaskDefLabel();
        String other$taskDefLabel = other.getTaskDefLabel();
        if (this$taskDefLabel == null ? other$taskDefLabel != null : !this$taskDefLabel.equals(other$taskDefLabel)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        return !(this$detail == null ? other$detail != null : !this$detail.equals(other$detail));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InterfaceDefExport;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $pda = this.getPda();
        result = result * 59 + ($pda == null ? 43 : ((Object)$pda).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $taskDefLabel = this.getTaskDefLabel();
        result = result * 59 + ($taskDefLabel == null ? 43 : $taskDefLabel.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        return result;
    }

    public String toString() {
        return "InterfaceDefExport(id=" + this.getId() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", createDate=" + this.getCreateDate() + ", projectId=" + this.getProjectId() + ", pda=" + this.getPda() + ", taskDefLabel=" + this.getTaskDefLabel() + ", detail=" + this.getDetail() + ")";
    }
}

