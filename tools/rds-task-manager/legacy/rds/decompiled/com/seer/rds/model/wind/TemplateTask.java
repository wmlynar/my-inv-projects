/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.TemplateTask
 *  com.seer.rds.model.wind.TemplateTask$TemplateTaskBuilder
 *  io.swagger.annotations.ApiModelProperty
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.TemplateTask;
import io.swagger.annotations.ApiModelProperty;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtasktemplate")
public class TemplateTask {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(nullable=false)
    private String templateName;
    @Column(nullable=false)
    private String templateDescription;
    private String templateDir;
    @Column(nullable=false, columnDefinition="INT default 0")
    @ApiModelProperty(value="\u662f\u5426\u542f\u7528 0:\u4e0d\u542f\u7528,1:\u6b63\u5728\u542f\u7528,2:\u542f\u7528\u5b8c\u6210")
    private Integer templateIfEnable;

    public static TemplateTaskBuilder builder() {
        return new TemplateTaskBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getTemplateName() {
        return this.templateName;
    }

    public String getTemplateDescription() {
        return this.templateDescription;
    }

    public String getTemplateDir() {
        return this.templateDir;
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

    public void setTemplateDir(String templateDir) {
        this.templateDir = templateDir;
    }

    public void setTemplateIfEnable(Integer templateIfEnable) {
        this.templateIfEnable = templateIfEnable;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TemplateTask)) {
            return false;
        }
        TemplateTask other = (TemplateTask)o;
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
        if (this$templateDescription == null ? other$templateDescription != null : !this$templateDescription.equals(other$templateDescription)) {
            return false;
        }
        String this$templateDir = this.getTemplateDir();
        String other$templateDir = other.getTemplateDir();
        return !(this$templateDir == null ? other$templateDir != null : !this$templateDir.equals(other$templateDir));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TemplateTask;
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
        String $templateDir = this.getTemplateDir();
        result = result * 59 + ($templateDir == null ? 43 : $templateDir.hashCode());
        return result;
    }

    public String toString() {
        return "TemplateTask(id=" + this.getId() + ", templateName=" + this.getTemplateName() + ", templateDescription=" + this.getTemplateDescription() + ", templateDir=" + this.getTemplateDir() + ", templateIfEnable=" + this.getTemplateIfEnable() + ")";
    }

    public TemplateTask() {
    }

    public TemplateTask(String id, String templateName, String templateDescription, String templateDir, Integer templateIfEnable) {
        this.id = id;
        this.templateName = templateName;
        this.templateDescription = templateDescription;
        this.templateDir = templateDir;
        this.templateIfEnable = templateIfEnable;
    }
}

