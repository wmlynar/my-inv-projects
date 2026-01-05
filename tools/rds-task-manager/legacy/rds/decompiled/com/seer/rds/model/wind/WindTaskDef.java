/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDef$WindTaskDefBuilder
 *  io.swagger.annotations.ApiModelProperty
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindTaskDef;
import io.swagger.annotations.ApiModelProperty;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtaskdef", indexes={@Index(name="label", columnList="label")})
public class WindTaskDef {
    @Id
    @GenericGenerator(name="session_info_uuid_gen", strategy="assigned")
    @GeneratedValue(generator="session_info_uuid_gen")
    private String id;
    private String projectId;
    private Integer version;
    private String label;
    @Column(nullable=true)
    @Lob
    private String detail;
    @Column(nullable=true, columnDefinition="INT default 0")
    private Integer status = 0;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createDate;
    private String remark;
    @Column(nullable=false, columnDefinition="INT default 0")
    @ApiModelProperty(value="\u662f\u5426\u5468\u671f\u4efb\u52a1 0:\u4e0d\u4e3a\u5468\u671f\u4efb\u52a1,1:\u5468\u671f\u4efb\u52a1")
    private Integer periodicTask = 0;
    @Column(nullable=false, columnDefinition="INT default 0")
    @ApiModelProperty(value="\u662f\u5426\u542f\u7528 0:\u4e0d\u542f\u7528,1:\u542f\u7528")
    private Integer ifEnable = 0;
    @Column(nullable=false, columnDefinition="INT default 1000")
    private Long period = 1000L;
    @Column(nullable=false, columnDefinition="INT default 3000")
    private Long delay = 3000L;
    @Column(nullable=true)
    private String templateName;
    @Column(nullable=true)
    private Boolean releaseSites = false;
    @Column(nullable=false)
    private Long windcategoryId = 0L;

    public WindTaskDef(String id, String label) {
        this.id = id;
        this.label = label;
    }

    public static WindTaskDefBuilder builder() {
        return new WindTaskDefBuilder();
    }

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

    public String getDetail() {
        return this.detail;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public String getRemark() {
        return this.remark;
    }

    public Integer getPeriodicTask() {
        return this.periodicTask;
    }

    public Integer getIfEnable() {
        return this.ifEnable;
    }

    public Long getPeriod() {
        return this.period;
    }

    public Long getDelay() {
        return this.delay;
    }

    public String getTemplateName() {
        return this.templateName;
    }

    public Boolean getReleaseSites() {
        return this.releaseSites;
    }

    public Long getWindcategoryId() {
        return this.windcategoryId;
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

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setPeriodicTask(Integer periodicTask) {
        this.periodicTask = periodicTask;
    }

    public void setIfEnable(Integer ifEnable) {
        this.ifEnable = ifEnable;
    }

    public void setPeriod(Long period) {
        this.period = period;
    }

    public void setDelay(Long delay) {
        this.delay = delay;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public void setReleaseSites(Boolean releaseSites) {
        this.releaseSites = releaseSites;
    }

    public void setWindcategoryId(Long windcategoryId) {
        this.windcategoryId = windcategoryId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskDef)) {
            return false;
        }
        WindTaskDef other = (WindTaskDef)o;
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
        Long this$period = this.getPeriod();
        Long other$period = other.getPeriod();
        if (this$period == null ? other$period != null : !((Object)this$period).equals(other$period)) {
            return false;
        }
        Long this$delay = this.getDelay();
        Long other$delay = other.getDelay();
        if (this$delay == null ? other$delay != null : !((Object)this$delay).equals(other$delay)) {
            return false;
        }
        Boolean this$releaseSites = this.getReleaseSites();
        Boolean other$releaseSites = other.getReleaseSites();
        if (this$releaseSites == null ? other$releaseSites != null : !((Object)this$releaseSites).equals(other$releaseSites)) {
            return false;
        }
        Long this$windcategoryId = this.getWindcategoryId();
        Long other$windcategoryId = other.getWindcategoryId();
        if (this$windcategoryId == null ? other$windcategoryId != null : !((Object)this$windcategoryId).equals(other$windcategoryId)) {
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
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        if (this$detail == null ? other$detail != null : !this$detail.equals(other$detail)) {
            return false;
        }
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        if (this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$templateName = this.getTemplateName();
        String other$templateName = other.getTemplateName();
        return !(this$templateName == null ? other$templateName != null : !this$templateName.equals(other$templateName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskDef;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Integer $periodicTask = this.getPeriodicTask();
        result = result * 59 + ($periodicTask == null ? 43 : ((Object)$periodicTask).hashCode());
        Integer $ifEnable = this.getIfEnable();
        result = result * 59 + ($ifEnable == null ? 43 : ((Object)$ifEnable).hashCode());
        Long $period = this.getPeriod();
        result = result * 59 + ($period == null ? 43 : ((Object)$period).hashCode());
        Long $delay = this.getDelay();
        result = result * 59 + ($delay == null ? 43 : ((Object)$delay).hashCode());
        Boolean $releaseSites = this.getReleaseSites();
        result = result * 59 + ($releaseSites == null ? 43 : ((Object)$releaseSites).hashCode());
        Long $windcategoryId = this.getWindcategoryId();
        result = result * 59 + ($windcategoryId == null ? 43 : ((Object)$windcategoryId).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $templateName = this.getTemplateName();
        result = result * 59 + ($templateName == null ? 43 : $templateName.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskDef(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", version=" + this.getVersion() + ", label=" + this.getLabel() + ", detail=" + this.getDetail() + ", status=" + this.getStatus() + ", createDate=" + this.getCreateDate() + ", remark=" + this.getRemark() + ", periodicTask=" + this.getPeriodicTask() + ", ifEnable=" + this.getIfEnable() + ", period=" + this.getPeriod() + ", delay=" + this.getDelay() + ", templateName=" + this.getTemplateName() + ", releaseSites=" + this.getReleaseSites() + ", windcategoryId=" + this.getWindcategoryId() + ")";
    }

    public WindTaskDef() {
    }

    public WindTaskDef(String id, String projectId, Integer version, String label, String detail, Integer status, Date createDate, String remark, Integer periodicTask, Integer ifEnable, Long period, Long delay, String templateName, Boolean releaseSites, Long windcategoryId) {
        this.id = id;
        this.projectId = projectId;
        this.version = version;
        this.label = label;
        this.detail = detail;
        this.status = status;
        this.createDate = createDate;
        this.remark = remark;
        this.periodicTask = periodicTask;
        this.ifEnable = ifEnable;
        this.period = period;
        this.delay = delay;
        this.templateName = templateName;
        this.releaseSites = releaseSites;
        this.windcategoryId = windcategoryId;
    }
}

