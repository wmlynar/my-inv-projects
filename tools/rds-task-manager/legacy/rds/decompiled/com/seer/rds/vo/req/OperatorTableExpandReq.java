/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.OperatorTableExpandReq
 */
package com.seer.rds.vo.req;

public class OperatorTableExpandReq {
    private String id;
    private String colId;
    private String contentId;
    private Object params;
    private Object formData;

    public String getId() {
        return this.id;
    }

    public String getColId() {
        return this.colId;
    }

    public String getContentId() {
        return this.contentId;
    }

    public Object getParams() {
        return this.params;
    }

    public Object getFormData() {
        return this.formData;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setColId(String colId) {
        this.colId = colId;
    }

    public void setContentId(String contentId) {
        this.contentId = contentId;
    }

    public void setParams(Object params) {
        this.params = params;
    }

    public void setFormData(Object formData) {
        this.formData = formData;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorTableExpandReq)) {
            return false;
        }
        OperatorTableExpandReq other = (OperatorTableExpandReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$colId = this.getColId();
        String other$colId = other.getColId();
        if (this$colId == null ? other$colId != null : !this$colId.equals(other$colId)) {
            return false;
        }
        String this$contentId = this.getContentId();
        String other$contentId = other.getContentId();
        if (this$contentId == null ? other$contentId != null : !this$contentId.equals(other$contentId)) {
            return false;
        }
        Object this$params = this.getParams();
        Object other$params = other.getParams();
        if (this$params == null ? other$params != null : !this$params.equals(other$params)) {
            return false;
        }
        Object this$formData = this.getFormData();
        Object other$formData = other.getFormData();
        return !(this$formData == null ? other$formData != null : !this$formData.equals(other$formData));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorTableExpandReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $colId = this.getColId();
        result = result * 59 + ($colId == null ? 43 : $colId.hashCode());
        String $contentId = this.getContentId();
        result = result * 59 + ($contentId == null ? 43 : $contentId.hashCode());
        Object $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : $params.hashCode());
        Object $formData = this.getFormData();
        result = result * 59 + ($formData == null ? 43 : $formData.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorTableExpandReq(id=" + this.getId() + ", colId=" + this.getColId() + ", contentId=" + this.getContentId() + ", params=" + this.getParams() + ", formData=" + this.getFormData() + ")";
    }
}

