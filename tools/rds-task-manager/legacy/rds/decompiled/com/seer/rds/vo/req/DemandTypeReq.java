/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.DemandTypeReq
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModelProperty;

public class DemandTypeReq {
    @ApiModelProperty(value="\u5c97\u4f4d", name="workType", required=false)
    private String workType;
    @ApiModelProperty(value="\u5de5\u4f4d", name="workStation", required=false)
    private String workStation;
    @ApiModelProperty(value="\u7528\u6237\u540d", name="userName", required=false)
    private String userName;
    @ApiModelProperty(value="\u65f6\u95f4\u7b5b\u9009\u7684\u5f00\u59cb\u65f6\u95f4", name="startTime", required=false)
    private String startTime = "";
    @ApiModelProperty(value="\u65f6\u95f4\u7b5b\u9009\u7684\u7ed3\u675f\u65f6\u95f4", name="endTime", required=false)
    private String endTime = "";
    private String id = "";
    @ApiModelProperty(value="PAD/WEB", name="from", required=false)
    private String from = "web";
    private String defLabel = "";
    private Integer status;
    @ApiModelProperty(value="\u5904\u7406\u4eba", name="handlerName", required=false)
    private String handlerName;

    public String getWorkType() {
        return this.workType;
    }

    public String getWorkStation() {
        return this.workStation;
    }

    public String getUserName() {
        return this.userName;
    }

    public String getStartTime() {
        return this.startTime;
    }

    public String getEndTime() {
        return this.endTime;
    }

    public String getId() {
        return this.id;
    }

    public String getFrom() {
        return this.from;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getHandlerName() {
        return this.handlerName;
    }

    public void setWorkType(String workType) {
        this.workType = workType;
    }

    public void setWorkStation(String workStation) {
        this.workStation = workStation;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setHandlerName(String handlerName) {
        this.handlerName = handlerName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandTypeReq)) {
            return false;
        }
        DemandTypeReq other = (DemandTypeReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$workType = this.getWorkType();
        String other$workType = other.getWorkType();
        if (this$workType == null ? other$workType != null : !this$workType.equals(other$workType)) {
            return false;
        }
        String this$workStation = this.getWorkStation();
        String other$workStation = other.getWorkStation();
        if (this$workStation == null ? other$workStation != null : !this$workStation.equals(other$workStation)) {
            return false;
        }
        String this$userName = this.getUserName();
        String other$userName = other.getUserName();
        if (this$userName == null ? other$userName != null : !this$userName.equals(other$userName)) {
            return false;
        }
        String this$startTime = this.getStartTime();
        String other$startTime = other.getStartTime();
        if (this$startTime == null ? other$startTime != null : !this$startTime.equals(other$startTime)) {
            return false;
        }
        String this$endTime = this.getEndTime();
        String other$endTime = other.getEndTime();
        if (this$endTime == null ? other$endTime != null : !this$endTime.equals(other$endTime)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$from = this.getFrom();
        String other$from = other.getFrom();
        if (this$from == null ? other$from != null : !this$from.equals(other$from)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$handlerName = this.getHandlerName();
        String other$handlerName = other.getHandlerName();
        return !(this$handlerName == null ? other$handlerName != null : !this$handlerName.equals(other$handlerName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandTypeReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $workType = this.getWorkType();
        result = result * 59 + ($workType == null ? 43 : $workType.hashCode());
        String $workStation = this.getWorkStation();
        result = result * 59 + ($workStation == null ? 43 : $workStation.hashCode());
        String $userName = this.getUserName();
        result = result * 59 + ($userName == null ? 43 : $userName.hashCode());
        String $startTime = this.getStartTime();
        result = result * 59 + ($startTime == null ? 43 : $startTime.hashCode());
        String $endTime = this.getEndTime();
        result = result * 59 + ($endTime == null ? 43 : $endTime.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $from = this.getFrom();
        result = result * 59 + ($from == null ? 43 : $from.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $handlerName = this.getHandlerName();
        result = result * 59 + ($handlerName == null ? 43 : $handlerName.hashCode());
        return result;
    }

    public String toString() {
        return "DemandTypeReq(workType=" + this.getWorkType() + ", workStation=" + this.getWorkStation() + ", userName=" + this.getUserName() + ", startTime=" + this.getStartTime() + ", endTime=" + this.getEndTime() + ", id=" + this.getId() + ", from=" + this.getFrom() + ", defLabel=" + this.getDefLabel() + ", status=" + this.getStatus() + ", handlerName=" + this.getHandlerName() + ")";
    }
}

