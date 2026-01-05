/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindDemandTask
 *  com.seer.rds.model.wind.WindDemandTask$WindDemandTaskBuilder
 *  com.seer.rds.vo.AttrVo
 *  io.swagger.annotations.ApiModelProperty
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindDemandTask;
import com.seer.rds.vo.AttrVo;
import io.swagger.annotations.ApiModelProperty;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_winddemandtask", indexes={@Index(name="winddemandtaskStatusIndex", columnList="status"), @Index(name="taskRecordIndex", columnList="taskRecordId")})
public class WindDemandTask {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(nullable=true, columnDefinition="varchar(100) default ''")
    @ApiModelProperty(value="\u540d\u79f0")
    private String defLabel;
    @Column(nullable=true, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u63cf\u8ff0")
    private String description;
    @Column(nullable=false)
    @ApiModelProperty(value="\u72b6\u6001\uff1a1,\u521b\u5efa\uff0c2\uff0c\u5df2\u5206\u914d\uff0c3,\u5df2\u5b8c\u6210\uff0c4\uff1a\u5df2\u5220\u9664")
    private Integer status = 1;
    @Column(nullable=true, columnDefinition="varchar(100) default ''")
    @ApiModelProperty(value="\u5904\u7406\u4eba")
    private String handler;
    @ApiModelProperty(value="\u5904\u7406\u65f6\u95f4")
    private Date handlerOn;
    @Column(nullable=true, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u5173\u8054\u7684\u4efb\u52a1\u5b9e\u4f8bid")
    private String taskRecordId;
    @Column(name="\"content\"", nullable=true, columnDefinition="varchar(1024) default ''")
    @ApiModelProperty(value="\u9700\u6c42\u5185\u5bb9\uff0cjson\u683c\u5f0f\u5b58\u50a8")
    private String content;
    @Column(nullable=true, columnDefinition="varchar(1024) default ''")
    @ApiModelProperty(value="\u8865\u5145\u9700\u6c42\u5185\u5bb9\uff0cjson\u683c\u5f0f\u5b58\u50a8")
    private String supplementContent;
    @Column(nullable=true, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u8865\u5145\u9700\u6c42\u83dc\u5355id")
    private String menuId;
    @Column(nullable=true, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u5c97\u4f4d")
    private String workTypes;
    @Column(nullable=true, columnDefinition="varchar(255) default '' ")
    @ApiModelProperty(value="\u5de5\u4f4d")
    private String workStations;
    @Column(nullable=true, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u5de5\u53f7")
    private String jobNumber;
    @Column(nullable=false)
    @ApiModelProperty(value="\u521b\u5efa\u65e5\u671f")
    private Date createdOn;
    @Column(nullable=true, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u521b\u5efa\u8005")
    private String createdBy;
    @Transient
    private String typeLabel;
    @Transient
    private String stateLabel;
    @Transient
    private String createTime;
    @Transient
    private String handlerTime;
    @Transient
    private List<AttrVo> attrList;

    public static WindDemandTaskBuilder builder() {
        return new WindDemandTaskBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getDescription() {
        return this.description;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getHandler() {
        return this.handler;
    }

    public Date getHandlerOn() {
        return this.handlerOn;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getContent() {
        return this.content;
    }

    public String getSupplementContent() {
        return this.supplementContent;
    }

    public String getMenuId() {
        return this.menuId;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public String getJobNumber() {
        return this.jobNumber;
    }

    public Date getCreatedOn() {
        return this.createdOn;
    }

    public String getCreatedBy() {
        return this.createdBy;
    }

    public String getTypeLabel() {
        return this.typeLabel;
    }

    public String getStateLabel() {
        return this.stateLabel;
    }

    public String getCreateTime() {
        return this.createTime;
    }

    public String getHandlerTime() {
        return this.handlerTime;
    }

    public List<AttrVo> getAttrList() {
        return this.attrList;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setHandler(String handler) {
        this.handler = handler;
    }

    public void setHandlerOn(Date handlerOn) {
        this.handlerOn = handlerOn;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setSupplementContent(String supplementContent) {
        this.supplementContent = supplementContent;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setJobNumber(String jobNumber) {
        this.jobNumber = jobNumber;
    }

    public void setCreatedOn(Date createdOn) {
        this.createdOn = createdOn;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public void setTypeLabel(String typeLabel) {
        this.typeLabel = typeLabel;
    }

    public void setStateLabel(String stateLabel) {
        this.stateLabel = stateLabel;
    }

    public void setCreateTime(String createTime) {
        this.createTime = createTime;
    }

    public void setHandlerTime(String handlerTime) {
        this.handlerTime = handlerTime;
    }

    public void setAttrList(List<AttrVo> attrList) {
        this.attrList = attrList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDemandTask)) {
            return false;
        }
        WindDemandTask other = (WindDemandTask)o;
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
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$description = this.getDescription();
        String other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) {
            return false;
        }
        String this$handler = this.getHandler();
        String other$handler = other.getHandler();
        if (this$handler == null ? other$handler != null : !this$handler.equals(other$handler)) {
            return false;
        }
        Date this$handlerOn = this.getHandlerOn();
        Date other$handlerOn = other.getHandlerOn();
        if (this$handlerOn == null ? other$handlerOn != null : !((Object)this$handlerOn).equals(other$handlerOn)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$content = this.getContent();
        String other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        String this$supplementContent = this.getSupplementContent();
        String other$supplementContent = other.getSupplementContent();
        if (this$supplementContent == null ? other$supplementContent != null : !this$supplementContent.equals(other$supplementContent)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        String this$workTypes = this.getWorkTypes();
        String other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        String this$workStations = this.getWorkStations();
        String other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations)) {
            return false;
        }
        String this$jobNumber = this.getJobNumber();
        String other$jobNumber = other.getJobNumber();
        if (this$jobNumber == null ? other$jobNumber != null : !this$jobNumber.equals(other$jobNumber)) {
            return false;
        }
        Date this$createdOn = this.getCreatedOn();
        Date other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !((Object)this$createdOn).equals(other$createdOn)) {
            return false;
        }
        String this$createdBy = this.getCreatedBy();
        String other$createdBy = other.getCreatedBy();
        if (this$createdBy == null ? other$createdBy != null : !this$createdBy.equals(other$createdBy)) {
            return false;
        }
        String this$typeLabel = this.getTypeLabel();
        String other$typeLabel = other.getTypeLabel();
        if (this$typeLabel == null ? other$typeLabel != null : !this$typeLabel.equals(other$typeLabel)) {
            return false;
        }
        String this$stateLabel = this.getStateLabel();
        String other$stateLabel = other.getStateLabel();
        if (this$stateLabel == null ? other$stateLabel != null : !this$stateLabel.equals(other$stateLabel)) {
            return false;
        }
        String this$createTime = this.getCreateTime();
        String other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !this$createTime.equals(other$createTime)) {
            return false;
        }
        String this$handlerTime = this.getHandlerTime();
        String other$handlerTime = other.getHandlerTime();
        if (this$handlerTime == null ? other$handlerTime != null : !this$handlerTime.equals(other$handlerTime)) {
            return false;
        }
        List this$attrList = this.getAttrList();
        List other$attrList = other.getAttrList();
        return !(this$attrList == null ? other$attrList != null : !((Object)this$attrList).equals(other$attrList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDemandTask;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        String $handler = this.getHandler();
        result = result * 59 + ($handler == null ? 43 : $handler.hashCode());
        Date $handlerOn = this.getHandlerOn();
        result = result * 59 + ($handlerOn == null ? 43 : ((Object)$handlerOn).hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        String $supplementContent = this.getSupplementContent();
        result = result * 59 + ($supplementContent == null ? 43 : $supplementContent.hashCode());
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $jobNumber = this.getJobNumber();
        result = result * 59 + ($jobNumber == null ? 43 : $jobNumber.hashCode());
        Date $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : ((Object)$createdOn).hashCode());
        String $createdBy = this.getCreatedBy();
        result = result * 59 + ($createdBy == null ? 43 : $createdBy.hashCode());
        String $typeLabel = this.getTypeLabel();
        result = result * 59 + ($typeLabel == null ? 43 : $typeLabel.hashCode());
        String $stateLabel = this.getStateLabel();
        result = result * 59 + ($stateLabel == null ? 43 : $stateLabel.hashCode());
        String $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : $createTime.hashCode());
        String $handlerTime = this.getHandlerTime();
        result = result * 59 + ($handlerTime == null ? 43 : $handlerTime.hashCode());
        List $attrList = this.getAttrList();
        result = result * 59 + ($attrList == null ? 43 : ((Object)$attrList).hashCode());
        return result;
    }

    public String toString() {
        return "WindDemandTask(id=" + this.getId() + ", defLabel=" + this.getDefLabel() + ", description=" + this.getDescription() + ", status=" + this.getStatus() + ", handler=" + this.getHandler() + ", handlerOn=" + this.getHandlerOn() + ", taskRecordId=" + this.getTaskRecordId() + ", content=" + this.getContent() + ", supplementContent=" + this.getSupplementContent() + ", menuId=" + this.getMenuId() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", jobNumber=" + this.getJobNumber() + ", createdOn=" + this.getCreatedOn() + ", createdBy=" + this.getCreatedBy() + ", typeLabel=" + this.getTypeLabel() + ", stateLabel=" + this.getStateLabel() + ", createTime=" + this.getCreateTime() + ", handlerTime=" + this.getHandlerTime() + ", attrList=" + this.getAttrList() + ")";
    }

    public WindDemandTask() {
    }

    public WindDemandTask(String id, String defLabel, String description, Integer status, String handler, Date handlerOn, String taskRecordId, String content, String supplementContent, String menuId, String workTypes, String workStations, String jobNumber, Date createdOn, String createdBy, String typeLabel, String stateLabel, String createTime, String handlerTime, List<AttrVo> attrList) {
        this.id = id;
        this.defLabel = defLabel;
        this.description = description;
        this.status = status;
        this.handler = handler;
        this.handlerOn = handlerOn;
        this.taskRecordId = taskRecordId;
        this.content = content;
        this.supplementContent = supplementContent;
        this.menuId = menuId;
        this.workTypes = workTypes;
        this.workStations = workStations;
        this.jobNumber = jobNumber;
        this.createdOn = createdOn;
        this.createdBy = createdBy;
        this.typeLabel = typeLabel;
        this.stateLabel = stateLabel;
        this.createTime = createTime;
        this.handlerTime = handlerTime;
        this.attrList = attrList;
    }
}

