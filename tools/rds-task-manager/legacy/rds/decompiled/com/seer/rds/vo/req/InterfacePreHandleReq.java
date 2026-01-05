/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.InterfacePreHandleReq
 */
package com.seer.rds.vo.req;

public class InterfacePreHandleReq {
    private String id;
    private String url;
    private String method;
    private Integer status;
    private String createdOn;
    private String endedOn;
    private String taskDefLabel;
    private String taskRecordId;

    public String getId() {
        return this.id;
    }

    public String getUrl() {
        return this.url;
    }

    public String getMethod() {
        return this.method;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getCreatedOn() {
        return this.createdOn;
    }

    public String getEndedOn() {
        return this.endedOn;
    }

    public String getTaskDefLabel() {
        return this.taskDefLabel;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
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

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCreatedOn(String createdOn) {
        this.createdOn = createdOn;
    }

    public void setEndedOn(String endedOn) {
        this.endedOn = endedOn;
    }

    public void setTaskDefLabel(String taskDefLabel) {
        this.taskDefLabel = taskDefLabel;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof InterfacePreHandleReq)) {
            return false;
        }
        InterfacePreHandleReq other = (InterfacePreHandleReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
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
        String this$createdOn = this.getCreatedOn();
        String other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !this$createdOn.equals(other$createdOn)) {
            return false;
        }
        String this$endedOn = this.getEndedOn();
        String other$endedOn = other.getEndedOn();
        if (this$endedOn == null ? other$endedOn != null : !this$endedOn.equals(other$endedOn)) {
            return false;
        }
        String this$taskDefLabel = this.getTaskDefLabel();
        String other$taskDefLabel = other.getTaskDefLabel();
        if (this$taskDefLabel == null ? other$taskDefLabel != null : !this$taskDefLabel.equals(other$taskDefLabel)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InterfacePreHandleReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        String $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : $createdOn.hashCode());
        String $endedOn = this.getEndedOn();
        result = result * 59 + ($endedOn == null ? 43 : $endedOn.hashCode());
        String $taskDefLabel = this.getTaskDefLabel();
        result = result * 59 + ($taskDefLabel == null ? 43 : $taskDefLabel.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "InterfacePreHandleReq(id=" + this.getId() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", status=" + this.getStatus() + ", createdOn=" + this.getCreatedOn() + ", endedOn=" + this.getEndedOn() + ", taskDefLabel=" + this.getTaskDefLabel() + ", taskRecordId=" + this.getTaskRecordId() + ")";
    }
}

