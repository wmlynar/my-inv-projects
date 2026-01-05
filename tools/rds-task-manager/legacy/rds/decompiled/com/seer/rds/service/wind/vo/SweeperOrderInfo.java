/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.vo.OrderInfo
 *  com.seer.rds.service.wind.vo.SweeperOrderInfo
 */
package com.seer.rds.service.wind.vo;

import com.seer.rds.service.wind.vo.OrderInfo;

public class SweeperOrderInfo {
    private String changeWaterId;
    private OrderInfo changeWaterOrder;
    private OrderInfo cleanOrder;
    private Integer createTime;
    private String externalId;
    private String id;
    private Integer priority;
    private Integer receiveTime;
    private OrderInfo recleanOrder;
    private String recleanOrderId;
    private String state;
    private Integer terminateTime;
    private String vehicle;
    private String workArea;

    public String getChangeWaterId() {
        return this.changeWaterId;
    }

    public OrderInfo getChangeWaterOrder() {
        return this.changeWaterOrder;
    }

    public OrderInfo getCleanOrder() {
        return this.cleanOrder;
    }

    public Integer getCreateTime() {
        return this.createTime;
    }

    public String getExternalId() {
        return this.externalId;
    }

    public String getId() {
        return this.id;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public Integer getReceiveTime() {
        return this.receiveTime;
    }

    public OrderInfo getRecleanOrder() {
        return this.recleanOrder;
    }

    public String getRecleanOrderId() {
        return this.recleanOrderId;
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

    public String getWorkArea() {
        return this.workArea;
    }

    public void setChangeWaterId(String changeWaterId) {
        this.changeWaterId = changeWaterId;
    }

    public void setChangeWaterOrder(OrderInfo changeWaterOrder) {
        this.changeWaterOrder = changeWaterOrder;
    }

    public void setCleanOrder(OrderInfo cleanOrder) {
        this.cleanOrder = cleanOrder;
    }

    public void setCreateTime(Integer createTime) {
        this.createTime = createTime;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public void setReceiveTime(Integer receiveTime) {
        this.receiveTime = receiveTime;
    }

    public void setRecleanOrder(OrderInfo recleanOrder) {
        this.recleanOrder = recleanOrder;
    }

    public void setRecleanOrderId(String recleanOrderId) {
        this.recleanOrderId = recleanOrderId;
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

    public void setWorkArea(String workArea) {
        this.workArea = workArea;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SweeperOrderInfo)) {
            return false;
        }
        SweeperOrderInfo other = (SweeperOrderInfo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$createTime = this.getCreateTime();
        Integer other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
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
        Integer this$terminateTime = this.getTerminateTime();
        Integer other$terminateTime = other.getTerminateTime();
        if (this$terminateTime == null ? other$terminateTime != null : !((Object)this$terminateTime).equals(other$terminateTime)) {
            return false;
        }
        String this$changeWaterId = this.getChangeWaterId();
        String other$changeWaterId = other.getChangeWaterId();
        if (this$changeWaterId == null ? other$changeWaterId != null : !this$changeWaterId.equals(other$changeWaterId)) {
            return false;
        }
        OrderInfo this$changeWaterOrder = this.getChangeWaterOrder();
        OrderInfo other$changeWaterOrder = other.getChangeWaterOrder();
        if (this$changeWaterOrder == null ? other$changeWaterOrder != null : !this$changeWaterOrder.equals(other$changeWaterOrder)) {
            return false;
        }
        OrderInfo this$cleanOrder = this.getCleanOrder();
        OrderInfo other$cleanOrder = other.getCleanOrder();
        if (this$cleanOrder == null ? other$cleanOrder != null : !this$cleanOrder.equals(other$cleanOrder)) {
            return false;
        }
        String this$externalId = this.getExternalId();
        String other$externalId = other.getExternalId();
        if (this$externalId == null ? other$externalId != null : !this$externalId.equals(other$externalId)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        OrderInfo this$recleanOrder = this.getRecleanOrder();
        OrderInfo other$recleanOrder = other.getRecleanOrder();
        if (this$recleanOrder == null ? other$recleanOrder != null : !this$recleanOrder.equals(other$recleanOrder)) {
            return false;
        }
        String this$recleanOrderId = this.getRecleanOrderId();
        String other$recleanOrderId = other.getRecleanOrderId();
        if (this$recleanOrderId == null ? other$recleanOrderId != null : !this$recleanOrderId.equals(other$recleanOrderId)) {
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
        String this$workArea = this.getWorkArea();
        String other$workArea = other.getWorkArea();
        return !(this$workArea == null ? other$workArea != null : !this$workArea.equals(other$workArea));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SweeperOrderInfo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        Integer $receiveTime = this.getReceiveTime();
        result = result * 59 + ($receiveTime == null ? 43 : ((Object)$receiveTime).hashCode());
        Integer $terminateTime = this.getTerminateTime();
        result = result * 59 + ($terminateTime == null ? 43 : ((Object)$terminateTime).hashCode());
        String $changeWaterId = this.getChangeWaterId();
        result = result * 59 + ($changeWaterId == null ? 43 : $changeWaterId.hashCode());
        OrderInfo $changeWaterOrder = this.getChangeWaterOrder();
        result = result * 59 + ($changeWaterOrder == null ? 43 : $changeWaterOrder.hashCode());
        OrderInfo $cleanOrder = this.getCleanOrder();
        result = result * 59 + ($cleanOrder == null ? 43 : $cleanOrder.hashCode());
        String $externalId = this.getExternalId();
        result = result * 59 + ($externalId == null ? 43 : $externalId.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        OrderInfo $recleanOrder = this.getRecleanOrder();
        result = result * 59 + ($recleanOrder == null ? 43 : $recleanOrder.hashCode());
        String $recleanOrderId = this.getRecleanOrderId();
        result = result * 59 + ($recleanOrderId == null ? 43 : $recleanOrderId.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        String $workArea = this.getWorkArea();
        result = result * 59 + ($workArea == null ? 43 : $workArea.hashCode());
        return result;
    }

    public String toString() {
        return "SweeperOrderInfo(changeWaterId=" + this.getChangeWaterId() + ", changeWaterOrder=" + this.getChangeWaterOrder() + ", cleanOrder=" + this.getCleanOrder() + ", createTime=" + this.getCreateTime() + ", externalId=" + this.getExternalId() + ", id=" + this.getId() + ", priority=" + this.getPriority() + ", receiveTime=" + this.getReceiveTime() + ", recleanOrder=" + this.getRecleanOrder() + ", recleanOrderId=" + this.getRecleanOrderId() + ", state=" + this.getState() + ", terminateTime=" + this.getTerminateTime() + ", vehicle=" + this.getVehicle() + ", workArea=" + this.getWorkArea() + ")";
    }
}

