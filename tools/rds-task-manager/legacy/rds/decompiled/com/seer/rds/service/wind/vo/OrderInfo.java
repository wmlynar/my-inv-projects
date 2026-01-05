/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.vo.AlarmInfo
 *  com.seer.rds.service.wind.vo.BlockInfo
 *  com.seer.rds.service.wind.vo.OrderInfo
 */
package com.seer.rds.service.wind.vo;

import com.seer.rds.service.wind.vo.AlarmInfo;
import com.seer.rds.service.wind.vo.BlockInfo;
import java.util.ArrayList;
import java.util.List;

public class OrderInfo {
    private List<BlockInfo> blocks = new ArrayList();
    private String candidateName;
    private Boolean complete;
    private Integer createTime;
    private List<AlarmInfo> errors;
    private Integer executionTimeCost;
    private String externalId;
    private Double finishOdo;
    private String group;
    private String id;
    private String label;
    private Integer mapfPriority;
    private List<AlarmInfo> notices;
    private Double orderMinScore;
    private Double orderOdo;
    private Double orderScore;
    private Boolean prePointRedo;
    private Integer priority;
    private Integer receiveTime;
    private Double startOdo;
    private String state;
    private Integer terminateTime;
    private String vehicle;
    private List<AlarmInfo> warnings;

    public List<BlockInfo> getBlocks() {
        return this.blocks;
    }

    public String getCandidateName() {
        return this.candidateName;
    }

    public Boolean getComplete() {
        return this.complete;
    }

    public Integer getCreateTime() {
        return this.createTime;
    }

    public List<AlarmInfo> getErrors() {
        return this.errors;
    }

    public Integer getExecutionTimeCost() {
        return this.executionTimeCost;
    }

    public String getExternalId() {
        return this.externalId;
    }

    public Double getFinishOdo() {
        return this.finishOdo;
    }

    public String getGroup() {
        return this.group;
    }

    public String getId() {
        return this.id;
    }

    public String getLabel() {
        return this.label;
    }

    public Integer getMapfPriority() {
        return this.mapfPriority;
    }

    public List<AlarmInfo> getNotices() {
        return this.notices;
    }

    public Double getOrderMinScore() {
        return this.orderMinScore;
    }

    public Double getOrderOdo() {
        return this.orderOdo;
    }

    public Double getOrderScore() {
        return this.orderScore;
    }

    public Boolean getPrePointRedo() {
        return this.prePointRedo;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public Integer getReceiveTime() {
        return this.receiveTime;
    }

    public Double getStartOdo() {
        return this.startOdo;
    }

    public String getState() {
        return this.state;
    }

    public Integer getTerminateTime() {
        return this.terminateTime;
    }

    public String getVehicle() {
        return this.vehicle;
    }

    public List<AlarmInfo> getWarnings() {
        return this.warnings;
    }

    public void setBlocks(List<BlockInfo> blocks) {
        this.blocks = blocks;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public void setComplete(Boolean complete) {
        this.complete = complete;
    }

    public void setCreateTime(Integer createTime) {
        this.createTime = createTime;
    }

    public void setErrors(List<AlarmInfo> errors) {
        this.errors = errors;
    }

    public void setExecutionTimeCost(Integer executionTimeCost) {
        this.executionTimeCost = executionTimeCost;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public void setFinishOdo(Double finishOdo) {
        this.finishOdo = finishOdo;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setMapfPriority(Integer mapfPriority) {
        this.mapfPriority = mapfPriority;
    }

    public void setNotices(List<AlarmInfo> notices) {
        this.notices = notices;
    }

    public void setOrderMinScore(Double orderMinScore) {
        this.orderMinScore = orderMinScore;
    }

    public void setOrderOdo(Double orderOdo) {
        this.orderOdo = orderOdo;
    }

    public void setOrderScore(Double orderScore) {
        this.orderScore = orderScore;
    }

    public void setPrePointRedo(Boolean prePointRedo) {
        this.prePointRedo = prePointRedo;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public void setReceiveTime(Integer receiveTime) {
        this.receiveTime = receiveTime;
    }

    public void setStartOdo(Double startOdo) {
        this.startOdo = startOdo;
    }

    public void setState(String state) {
        this.state = state;
    }

    public void setTerminateTime(Integer terminateTime) {
        this.terminateTime = terminateTime;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setWarnings(List<AlarmInfo> warnings) {
        this.warnings = warnings;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OrderInfo)) {
            return false;
        }
        OrderInfo other = (OrderInfo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$complete = this.getComplete();
        Boolean other$complete = other.getComplete();
        if (this$complete == null ? other$complete != null : !((Object)this$complete).equals(other$complete)) {
            return false;
        }
        Integer this$createTime = this.getCreateTime();
        Integer other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        Integer this$executionTimeCost = this.getExecutionTimeCost();
        Integer other$executionTimeCost = other.getExecutionTimeCost();
        if (this$executionTimeCost == null ? other$executionTimeCost != null : !((Object)this$executionTimeCost).equals(other$executionTimeCost)) {
            return false;
        }
        Double this$finishOdo = this.getFinishOdo();
        Double other$finishOdo = other.getFinishOdo();
        if (this$finishOdo == null ? other$finishOdo != null : !((Object)this$finishOdo).equals(other$finishOdo)) {
            return false;
        }
        Integer this$mapfPriority = this.getMapfPriority();
        Integer other$mapfPriority = other.getMapfPriority();
        if (this$mapfPriority == null ? other$mapfPriority != null : !((Object)this$mapfPriority).equals(other$mapfPriority)) {
            return false;
        }
        Double this$orderMinScore = this.getOrderMinScore();
        Double other$orderMinScore = other.getOrderMinScore();
        if (this$orderMinScore == null ? other$orderMinScore != null : !((Object)this$orderMinScore).equals(other$orderMinScore)) {
            return false;
        }
        Double this$orderOdo = this.getOrderOdo();
        Double other$orderOdo = other.getOrderOdo();
        if (this$orderOdo == null ? other$orderOdo != null : !((Object)this$orderOdo).equals(other$orderOdo)) {
            return false;
        }
        Double this$orderScore = this.getOrderScore();
        Double other$orderScore = other.getOrderScore();
        if (this$orderScore == null ? other$orderScore != null : !((Object)this$orderScore).equals(other$orderScore)) {
            return false;
        }
        Boolean this$prePointRedo = this.getPrePointRedo();
        Boolean other$prePointRedo = other.getPrePointRedo();
        if (this$prePointRedo == null ? other$prePointRedo != null : !((Object)this$prePointRedo).equals(other$prePointRedo)) {
            return false;
        }
        Integer this$priority = this.getPriority();
        Integer other$priority = other.getPriority();
        if (this$priority == null ? other$priority != null : !((Object)this$priority).equals(other$priority)) {
            return false;
        }
        Integer this$receiveTime = this.getReceiveTime();
        Integer other$receiveTime = other.getReceiveTime();
        if (this$receiveTime == null ? other$receiveTime != null : !((Object)this$receiveTime).equals(other$receiveTime)) {
            return false;
        }
        Double this$startOdo = this.getStartOdo();
        Double other$startOdo = other.getStartOdo();
        if (this$startOdo == null ? other$startOdo != null : !((Object)this$startOdo).equals(other$startOdo)) {
            return false;
        }
        Integer this$terminateTime = this.getTerminateTime();
        Integer other$terminateTime = other.getTerminateTime();
        if (this$terminateTime == null ? other$terminateTime != null : !((Object)this$terminateTime).equals(other$terminateTime)) {
            return false;
        }
        List this$blocks = this.getBlocks();
        List other$blocks = other.getBlocks();
        if (this$blocks == null ? other$blocks != null : !((Object)this$blocks).equals(other$blocks)) {
            return false;
        }
        String this$candidateName = this.getCandidateName();
        String other$candidateName = other.getCandidateName();
        if (this$candidateName == null ? other$candidateName != null : !this$candidateName.equals(other$candidateName)) {
            return false;
        }
        List this$errors = this.getErrors();
        List other$errors = other.getErrors();
        if (this$errors == null ? other$errors != null : !((Object)this$errors).equals(other$errors)) {
            return false;
        }
        String this$externalId = this.getExternalId();
        String other$externalId = other.getExternalId();
        if (this$externalId == null ? other$externalId != null : !this$externalId.equals(other$externalId)) {
            return false;
        }
        String this$group = this.getGroup();
        String other$group = other.getGroup();
        if (this$group == null ? other$group != null : !this$group.equals(other$group)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        List this$notices = this.getNotices();
        List other$notices = other.getNotices();
        if (this$notices == null ? other$notices != null : !((Object)this$notices).equals(other$notices)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        if (this$state == null ? other$state != null : !this$state.equals(other$state)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        List this$warnings = this.getWarnings();
        List other$warnings = other.getWarnings();
        return !(this$warnings == null ? other$warnings != null : !((Object)this$warnings).equals(other$warnings));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OrderInfo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $complete = this.getComplete();
        result = result * 59 + ($complete == null ? 43 : ((Object)$complete).hashCode());
        Integer $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Integer $executionTimeCost = this.getExecutionTimeCost();
        result = result * 59 + ($executionTimeCost == null ? 43 : ((Object)$executionTimeCost).hashCode());
        Double $finishOdo = this.getFinishOdo();
        result = result * 59 + ($finishOdo == null ? 43 : ((Object)$finishOdo).hashCode());
        Integer $mapfPriority = this.getMapfPriority();
        result = result * 59 + ($mapfPriority == null ? 43 : ((Object)$mapfPriority).hashCode());
        Double $orderMinScore = this.getOrderMinScore();
        result = result * 59 + ($orderMinScore == null ? 43 : ((Object)$orderMinScore).hashCode());
        Double $orderOdo = this.getOrderOdo();
        result = result * 59 + ($orderOdo == null ? 43 : ((Object)$orderOdo).hashCode());
        Double $orderScore = this.getOrderScore();
        result = result * 59 + ($orderScore == null ? 43 : ((Object)$orderScore).hashCode());
        Boolean $prePointRedo = this.getPrePointRedo();
        result = result * 59 + ($prePointRedo == null ? 43 : ((Object)$prePointRedo).hashCode());
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        Integer $receiveTime = this.getReceiveTime();
        result = result * 59 + ($receiveTime == null ? 43 : ((Object)$receiveTime).hashCode());
        Double $startOdo = this.getStartOdo();
        result = result * 59 + ($startOdo == null ? 43 : ((Object)$startOdo).hashCode());
        Integer $terminateTime = this.getTerminateTime();
        result = result * 59 + ($terminateTime == null ? 43 : ((Object)$terminateTime).hashCode());
        List $blocks = this.getBlocks();
        result = result * 59 + ($blocks == null ? 43 : ((Object)$blocks).hashCode());
        String $candidateName = this.getCandidateName();
        result = result * 59 + ($candidateName == null ? 43 : $candidateName.hashCode());
        List $errors = this.getErrors();
        result = result * 59 + ($errors == null ? 43 : ((Object)$errors).hashCode());
        String $externalId = this.getExternalId();
        result = result * 59 + ($externalId == null ? 43 : $externalId.hashCode());
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        List $notices = this.getNotices();
        result = result * 59 + ($notices == null ? 43 : ((Object)$notices).hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        List $warnings = this.getWarnings();
        result = result * 59 + ($warnings == null ? 43 : ((Object)$warnings).hashCode());
        return result;
    }

    public String toString() {
        return "OrderInfo(blocks=" + this.getBlocks() + ", candidateName=" + this.getCandidateName() + ", complete=" + this.getComplete() + ", createTime=" + this.getCreateTime() + ", errors=" + this.getErrors() + ", executionTimeCost=" + this.getExecutionTimeCost() + ", externalId=" + this.getExternalId() + ", finishOdo=" + this.getFinishOdo() + ", group=" + this.getGroup() + ", id=" + this.getId() + ", label=" + this.getLabel() + ", mapfPriority=" + this.getMapfPriority() + ", notices=" + this.getNotices() + ", orderMinScore=" + this.getOrderMinScore() + ", orderOdo=" + this.getOrderOdo() + ", orderScore=" + this.getOrderScore() + ", prePointRedo=" + this.getPrePointRedo() + ", priority=" + this.getPriority() + ", receiveTime=" + this.getReceiveTime() + ", startOdo=" + this.getStartOdo() + ", state=" + this.getState() + ", terminateTime=" + this.getTerminateTime() + ", vehicle=" + this.getVehicle() + ", warnings=" + this.getWarnings() + ")";
    }
}

