/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.vo.response.RobotInfoExVo
 *  com.seer.rds.vo.response.RobotInfoExVo$RobotInfoExVoBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.response;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.vo.response.RobotInfoExVo;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(value="\u673a\u5668\u4eba\u4fe1\u606f\u5bfc\u51fa\u5bf9\u8c61")
public class RobotInfoExVo {
    @Excel(name="agv.export.uuid", orderNum="0")
    @ApiModelProperty(value="\u673a\u5668\u4eba")
    private String uuid;
    @Excel(name="agv.export.ip", orderNum="1")
    @ApiModelProperty(value="IP")
    private String ip;
    @Excel(name="agv.export.currentGroup", orderNum="2")
    @ApiModelProperty(value="\u7ec4")
    private String currentGroup;
    @Excel(name="agv.export.dispatchable", orderNum="3")
    @ApiModelProperty(value="\u673a\u5668\u4eba\u53ef\u63a5\u5355\u72b6\u6001\uff0ctrue\u4e3a\u53ef\u63a5\u5355\uff0cfalse\u4e3a\u4e0d\u53ef\u63a5\u5355")
    private String dispatchable;
    @Excel(name="agv.export.orderId", orderNum="4")
    @ApiModelProperty(value="\u8fd0\u5355\u53f7")
    private String orderId;
    @Excel(name="agv.export.out_order_no", orderNum="5")
    @ApiModelProperty(value="\u5916\u90e8\u8ba2\u5355\u53f7")
    private String out_order_no;
    @Excel(name="agv.export.state", orderNum="6")
    @ApiModelProperty(value="\u8fd0\u5355\u72b6\u6001")
    private String state;
    @Excel(name="agv.export.battery_level", orderNum="7")
    @ApiModelProperty(value="\u673a\u5668\u4eba\u7535\u6c60\u7535\u91cf, \u8303\u56f4 [0, 1]")
    private Double battery_level;
    @Excel(name="agv.export.confidence", orderNum="8")
    @ApiModelProperty(value="\u673a\u5668\u4eba\u7684\u5b9a\u4f4d\u7f6e\u4fe1\u5ea6, \u8303\u56f4 [0, 1]")
    private Double confidence;
    @Excel(name="agv.export.unlock", orderNum="9")
    @ApiModelProperty(value="0: \u63a7\u5236\u6743\u5728 RDSCore \u624b\u4e0a 1: \u63a7\u5236\u6743\u88ab\u5176\u4ed6\u4eba\u62a2\u8d70; 2: \u63a7\u5236\u6743\u6ca1\u6709\u88ab\u62a2\u5360")
    private String unlock;
    @Excel(name="agv.export.reloc_status", orderNum="10")
    @ApiModelProperty(value="0 = FAILED(\u5b9a\u4f4d\u5931\u8d25), 1 = SUCCESS(\u5b9a\u4f4d\u6b63\u786e), 2 = RELOCING(\u6b63\u5728\u91cd\u5b9a\u4f4d), 3=COMPLETED(\u5b9a\u4f4d\u5b8c\u6210)")
    private String reloc_status;
    @Excel(name="agv.export.task_status", orderNum="11")
    @ApiModelProperty(value="\u673a\u5668\u4eba\u5f53\u524d\u7684\u5bfc\u822a\u72b6\u6001\uff1a0 = NONE, 1 = WAITING(\u76ee\u524d\u4e0d\u53ef\u80fd\u51fa\u73b0\u8be5\u72b6\u6001), 2 = RUNNING, 3 = SUSPENDED, 4 = COMPLETED, 5 = FAILED, 6 = CANCELED")
    private String task_status;
    @Excel(name="agv.export.current_map", orderNum="12")
    @ApiModelProperty(value="\u5f53\u524d\u5730\u56fe")
    private String current_map;

    public static RobotInfoExVoBuilder builder() {
        return new RobotInfoExVoBuilder();
    }

    public String getUuid() {
        return this.uuid;
    }

    public String getIp() {
        return this.ip;
    }

    public String getCurrentGroup() {
        return this.currentGroup;
    }

    public String getDispatchable() {
        return this.dispatchable;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public String getOut_order_no() {
        return this.out_order_no;
    }

    public String getState() {
        return this.state;
    }

    public Double getBattery_level() {
        return this.battery_level;
    }

    public Double getConfidence() {
        return this.confidence;
    }

    public String getUnlock() {
        return this.unlock;
    }

    public String getReloc_status() {
        return this.reloc_status;
    }

    public String getTask_status() {
        return this.task_status;
    }

    public String getCurrent_map() {
        return this.current_map;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setCurrentGroup(String currentGroup) {
        this.currentGroup = currentGroup;
    }

    public void setDispatchable(String dispatchable) {
        this.dispatchable = dispatchable;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public void setOut_order_no(String out_order_no) {
        this.out_order_no = out_order_no;
    }

    public void setState(String state) {
        this.state = state;
    }

    public void setBattery_level(Double battery_level) {
        this.battery_level = battery_level;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public void setUnlock(String unlock) {
        this.unlock = unlock;
    }

    public void setReloc_status(String reloc_status) {
        this.reloc_status = reloc_status;
    }

    public void setTask_status(String task_status) {
        this.task_status = task_status;
    }

    public void setCurrent_map(String current_map) {
        this.current_map = current_map;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotInfoExVo)) {
            return false;
        }
        RobotInfoExVo other = (RobotInfoExVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Double this$battery_level = this.getBattery_level();
        Double other$battery_level = other.getBattery_level();
        if (this$battery_level == null ? other$battery_level != null : !((Object)this$battery_level).equals(other$battery_level)) {
            return false;
        }
        Double this$confidence = this.getConfidence();
        Double other$confidence = other.getConfidence();
        if (this$confidence == null ? other$confidence != null : !((Object)this$confidence).equals(other$confidence)) {
            return false;
        }
        String this$uuid = this.getUuid();
        String other$uuid = other.getUuid();
        if (this$uuid == null ? other$uuid != null : !this$uuid.equals(other$uuid)) {
            return false;
        }
        String this$ip = this.getIp();
        String other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        String this$currentGroup = this.getCurrentGroup();
        String other$currentGroup = other.getCurrentGroup();
        if (this$currentGroup == null ? other$currentGroup != null : !this$currentGroup.equals(other$currentGroup)) {
            return false;
        }
        String this$dispatchable = this.getDispatchable();
        String other$dispatchable = other.getDispatchable();
        if (this$dispatchable == null ? other$dispatchable != null : !this$dispatchable.equals(other$dispatchable)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        if (this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId)) {
            return false;
        }
        String this$out_order_no = this.getOut_order_no();
        String other$out_order_no = other.getOut_order_no();
        if (this$out_order_no == null ? other$out_order_no != null : !this$out_order_no.equals(other$out_order_no)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        if (this$state == null ? other$state != null : !this$state.equals(other$state)) {
            return false;
        }
        String this$unlock = this.getUnlock();
        String other$unlock = other.getUnlock();
        if (this$unlock == null ? other$unlock != null : !this$unlock.equals(other$unlock)) {
            return false;
        }
        String this$reloc_status = this.getReloc_status();
        String other$reloc_status = other.getReloc_status();
        if (this$reloc_status == null ? other$reloc_status != null : !this$reloc_status.equals(other$reloc_status)) {
            return false;
        }
        String this$task_status = this.getTask_status();
        String other$task_status = other.getTask_status();
        if (this$task_status == null ? other$task_status != null : !this$task_status.equals(other$task_status)) {
            return false;
        }
        String this$current_map = this.getCurrent_map();
        String other$current_map = other.getCurrent_map();
        return !(this$current_map == null ? other$current_map != null : !this$current_map.equals(other$current_map));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotInfoExVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Double $battery_level = this.getBattery_level();
        result = result * 59 + ($battery_level == null ? 43 : ((Object)$battery_level).hashCode());
        Double $confidence = this.getConfidence();
        result = result * 59 + ($confidence == null ? 43 : ((Object)$confidence).hashCode());
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $currentGroup = this.getCurrentGroup();
        result = result * 59 + ($currentGroup == null ? 43 : $currentGroup.hashCode());
        String $dispatchable = this.getDispatchable();
        result = result * 59 + ($dispatchable == null ? 43 : $dispatchable.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $out_order_no = this.getOut_order_no();
        result = result * 59 + ($out_order_no == null ? 43 : $out_order_no.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        String $unlock = this.getUnlock();
        result = result * 59 + ($unlock == null ? 43 : $unlock.hashCode());
        String $reloc_status = this.getReloc_status();
        result = result * 59 + ($reloc_status == null ? 43 : $reloc_status.hashCode());
        String $task_status = this.getTask_status();
        result = result * 59 + ($task_status == null ? 43 : $task_status.hashCode());
        String $current_map = this.getCurrent_map();
        result = result * 59 + ($current_map == null ? 43 : $current_map.hashCode());
        return result;
    }

    public String toString() {
        return "RobotInfoExVo(uuid=" + this.getUuid() + ", ip=" + this.getIp() + ", currentGroup=" + this.getCurrentGroup() + ", dispatchable=" + this.getDispatchable() + ", orderId=" + this.getOrderId() + ", out_order_no=" + this.getOut_order_no() + ", state=" + this.getState() + ", battery_level=" + this.getBattery_level() + ", confidence=" + this.getConfidence() + ", unlock=" + this.getUnlock() + ", reloc_status=" + this.getReloc_status() + ", task_status=" + this.getTask_status() + ", current_map=" + this.getCurrent_map() + ")";
    }

    public RobotInfoExVo(String uuid, String ip, String currentGroup, String dispatchable, String orderId, String out_order_no, String state, Double battery_level, Double confidence, String unlock, String reloc_status, String task_status, String current_map) {
        this.uuid = uuid;
        this.ip = ip;
        this.currentGroup = currentGroup;
        this.dispatchable = dispatchable;
        this.orderId = orderId;
        this.out_order_no = out_order_no;
        this.state = state;
        this.battery_level = battery_level;
        this.confidence = confidence;
        this.unlock = unlock;
        this.reloc_status = reloc_status;
        this.task_status = task_status;
        this.current_map = current_map;
    }

    public RobotInfoExVo() {
    }
}

