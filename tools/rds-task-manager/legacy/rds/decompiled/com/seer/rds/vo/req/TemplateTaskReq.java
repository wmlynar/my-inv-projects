/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.TemplateTaskReq
 */
package com.seer.rds.vo.req;

public class TemplateTaskReq {
    private String id;
    private String templateName;
    private String templateDescription;
    private Integer templateIfEnable;

    public String getId() {
        return this.id;
    }

    public String getTemplateName() {
        return this.templateName;
    }

    public String getTemplateDescription() {
        return this.templateDescription;
    }

    public Integer getTemplateIfEnable() {
        return this.templateIfEnable;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public void setTemplateDescription(String templateDescription) {
        this.templateDescription = templateDescription;
    }

    public void setTemplateIfEnable(Integer templateIfEnable) {
        this.templateIfEnable = templateIfEnable;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TemplateTaskReq)) {
            return false;
        }
        TemplateTaskReq other = (TemplateTaskReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$templateIfEnable = this.getTemplateIfEnable();
        Integer other$templateIfEnable = other.getTemplateIfEnable();
        if (this$templateIfEnable == null ? other$templateIfEnable != null : !((Object)this$templateIfEnable).equals(other$templateIfEnable)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$templateName = this.getTemplateName();
        String other$templateName = other.getTemplateName();
        if (this$templateName == null ? other$templateName != null : !this$templateName.equals(other$templateName)) {
            return false;
        }
        String this$templateDescription = this.getTemplateDescription();
        String other$templateDescription = other.getTemplateDescription();
        return !(this$templateDescription == null ? other$templateDescription != null : !this$templateDescription.equals(other$templateDescription));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TemplateTaskReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $templateIfEnable = this.getTemplateIfEnable();
        result = result * 59 + ($templateIfEnable == null ? 43 : ((Object)$templateIfEnable).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $templateName = this.getTemplateName();
        result = result * 59 + ($templateName == null ? 43 : $templateName.hashCode());
        String $templateDescription = this.getTemplateDescription();
        result = result * 59 + ($templateDescription == null ? 43 : $templateDescription.hashCode());
        return result;
    }

    public String toString() {
        return "TemplateTaskReq(id=" + this.getId() + ", templateName=" + this.getTemplateName() + ", templateDescription=" + this.getTemplateDescription() + ", templateIfEnable=" + this.getTemplateIfEnable() + ")";
    }
}

