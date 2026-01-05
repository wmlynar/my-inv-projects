/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.seer.rds.vo.response.RobotInfoVo
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.response;

import com.alibaba.fastjson.JSONArray;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(value="\u673a\u5668\u4eba\u5bf9\u8c61")
public class RobotInfoVo {
    @ApiModelProperty(value="\u673a\u5668\u4eba")
    private String uuid;
    @ApiModelProperty(value="IP")
    private String ip;
    @ApiModelProperty(value="\u7ec4")
    private String currentGroup;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u53ef\u63a5\u5355\u72b6\u6001\uff0ctrue\u4e3a\u53ef\u63a5\u5355\uff0cfalse\u4e3a\u4e0d\u53ef\u63a5\u5355")
    private Boolean dispatchable;
    @ApiModelProperty(value="\u53ef\u63a5\u5355\u72b6\u6001\uff1a0 \u53ef\u63a5\u5355\uff0c1 \u4e0d\u53ef\u63a5\u5355(\u5c0f\u8f66\u5360\u7528\u8d44\u6e90)\uff0c 2 \u4e0d\u53ef\u63a5\u5355(\u5c0f\u8f66\u4e0d\u5360\u7528\u8d44\u6e90)")
    private Integer dispatchable_status;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u5f53\u524d\u5730\u56fe\u4e0d\u5728\u573a\u666f\u4e2d")
    private Boolean current_map_invalid;
    @ApiModelProperty(value="\u4e0e\u673a\u5668\u4eba\u7f51\u7edc\u65ad\u8fde")
    private Boolean disconnect;
    @ApiModelProperty(value="\u4f4e\u7535\u91cf")
    private Boolean low_battery;
    @ApiModelProperty(value="\u672a\u786e\u8ba4\u5b9a\u4f4d")
    private Boolean unconfirmed_reloc;
    @ApiModelProperty(value="0: \u63a7\u5236\u6743\u5728 RDSCore \u624b\u4e0a 1: \u63a7\u5236\u6743\u88ab\u5176\u4ed6\u4eba\u62a2\u8d70; 2: \u63a7\u5236\u6743\u6ca1\u6709\u88ab\u62a2\u5360")
    private Integer unlock;
    @ApiModelProperty(value="id: \u5bf9\u5e94\u7684 id \u53f7\uff0cstatus: \u8868\u793a\u9ad8\u4f4e\u7535\u5e73\uff0ctrue = \u9ad8\u7535\u5e73\uff0cfalse = \u4f4e\u7535\u5e73")
    private JSONArray DI;
    @ApiModelProperty(value="id: \u5bf9\u5e94\u7684 id \u53f7\uff0cstatus: \u8868\u793a\u9ad8\u4f4e\u7535\u5e73\uff0ctrue = \u9ad8\u7535\u5e73\uff0cfalse = \u4f4e\u7535\u5e73")
    private JSONArray DO;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u9519\u8bef\u7801")
    private JSONArray errors;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u7535\u6c60\u7535\u91cf, \u8303\u56f4 [0, 1]")
    private Double battery_level;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u7684\u5b9a\u4f4d\u7f6e\u4fe1\u5ea6, \u8303\u56f4 [0, 1]")
    private Double confidence;
    @ApiModelProperty(value="0 = FAILED(\u5b9a\u4f4d\u5931\u8d25), 1 = SUCCESS(\u5b9a\u4f4d\u6b63\u786e), 2 = RELOCING(\u6b63\u5728\u91cd\u5b9a\u4f4d), 3=COMPLETED(\u5b9a\u4f4d\u5b8c\u6210)")
    private Integer reloc_status;
    @ApiModelProperty(value="\u673a\u5668\u4eba\u5f53\u524d\u7684\u5bfc\u822a\u72b6\u6001\uff1a0 = NONE, 1 = WAITING(\u76ee\u524d\u4e0d\u53ef\u80fd\u51fa\u73b0\u8be5\u72b6\u6001), 2 = RUNNING, 3 = SUSPENDED, 4 = COMPLETED, 5 = FAILED, 6 = CANCELED")
    private Integer task_status;
    @ApiModelProperty(value="\u5f53\u524d\u5730\u56fe")
    private String current_map;
    @ApiModelProperty(value="\u8fd0\u5355\u53f7")
    private String orderId;
    @ApiModelProperty(value="\u5916\u90e8\u8ba2\u5355\u53f7")
    private String out_order_no;
    @ApiModelProperty(value="\u8fd0\u5355\u72b6\u6001")
    private String state;

    public String getUuid() {
        return this.uuid;
    }

    public String getIp() {
        return this.ip;
    }

    public String getCurrentGroup() {
        return this.currentGroup;
    }

    public Boolean getDispatchable() {
        return this.dispatchable;
    }

    public Integer getDispatchable_status() {
        return this.dispatchable_status;
    }

    public Boolean getCurrent_map_invalid() {
        return this.current_map_invalid;
    }

    public Boolean getDisconnect() {
        return this.disconnect;
    }

    public Boolean getLow_battery() {
        return this.low_battery;
    }

    public Boolean getUnconfirmed_reloc() {
        return this.unconfirmed_reloc;
    }

    public Integer getUnlock() {
        return this.unlock;
    }

    public JSONArray getDI() {
        return this.DI;
    }

    public JSONArray getDO() {
        return this.DO;
    }

    public JSONArray getErrors() {
        return this.errors;
    }

    public Double getBattery_level() {
        return this.battery_level;
    }

    public Double getConfidence() {
        return this.confidence;
    }

    public Integer getReloc_status() {
        return this.reloc_status;
    }

    public Integer getTask_status() {
        return this.task_status;
    }

    public String getCurrent_map() {
        return this.current_map;
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

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setCurrentGroup(String currentGroup) {
        this.currentGroup = currentGroup;
    }

    public void setDispatchable(Boolean dispatchable) {
        this.dispatchable = dispatchable;
    }

    public void setDispatchable_status(Integer dispatchable_status) {
        this.dispatchable_status = dispatchable_status;
    }

    public void setCurrent_map_invalid(Boolean current_map_invalid) {
        this.current_map_invalid = current_map_invalid;
    }

    public void setDisconnect(Boolean disconnect) {
        this.disconnect = disconnect;
    }

    public void setLow_battery(Boolean low_battery) {
        this.low_battery = low_battery;
    }

    public void setUnconfirmed_reloc(Boolean unconfirmed_reloc) {
        this.unconfirmed_reloc = unconfirmed_reloc;
    }

    public void setUnlock(Integer unlock) {
        this.unlock = unlock;
    }

    public void setDI(JSONArray DI) {
        this.DI = DI;
    }

    public void setDO(JSONArray DO) {
        this.DO = DO;
    }

    public void setErrors(JSONArray errors) {
        this.errors = errors;
    }

    public void setBattery_level(Double battery_level) {
        this.battery_level = battery_level;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public void setReloc_status(Integer reloc_status) {
        this.reloc_status = reloc_status;
    }

    public void setTask_status(Integer task_status) {
        this.task_status = task_status;
    }

    public void setCurrent_map(String current_map) {
        this.current_map = current_map;
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

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotInfoVo)) {
            return false;
        }
        RobotInfoVo other = (RobotInfoVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$dispatchable = this.getDispatchable();
        Boolean other$dispatchable = other.getDispatchable();
        if (this$dispatchable == null ? other$dispatchable != null : !((Object)this$dispatchable).equals(other$dispatchable)) {
            return false;
        }
        Integer this$dispatchable_status = this.getDispatchable_status();
        Integer other$dispatchable_status = other.getDispatchable_status();
        if (this$dispatchable_status == null ? other$dispatchable_status != null : !((Object)this$dispatchable_status).equals(other$dispatchable_status)) {
            return false;
        }
        Boolean this$current_map_invalid = this.getCurrent_map_invalid();
        Boolean other$current_map_invalid = other.getCurrent_map_invalid();
        if (this$current_map_invalid == null ? other$current_map_invalid != null : !((Object)this$current_map_invalid).equals(other$current_map_invalid)) {
            return false;
        }
        Boolean this$disconnect = this.getDisconnect();
        Boolean other$disconnect = other.getDisconnect();
        if (this$disconnect == null ? other$disconnect != null : !((Object)this$disconnect).equals(other$disconnect)) {
            return false;
        }
        Boolean this$low_battery = this.getLow_battery();
        Boolean other$low_battery = other.getLow_battery();
        if (this$low_battery == null ? other$low_battery != null : !((Object)this$low_battery).equals(other$low_battery)) {
            return false;
        }
        Boolean this$unconfirmed_reloc = this.getUnconfirmed_reloc();
        Boolean other$unconfirmed_reloc = other.getUnconfirmed_reloc();
        if (this$unconfirmed_reloc == null ? other$unconfirmed_reloc != null : !((Object)this$unconfirmed_reloc).equals(other$unconfirmed_reloc)) {
            return false;
        }
        Integer this$unlock = this.getUnlock();
        Integer other$unlock = other.getUnlock();
        if (this$unlock == null ? other$unlock != null : !((Object)this$unlock).equals(other$unlock)) {
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
        Integer this$reloc_status = this.getReloc_status();
        Integer other$reloc_status = other.getReloc_status();
        if (this$reloc_status == null ? other$reloc_status != null : !((Object)this$reloc_status).equals(other$reloc_status)) {
            return false;
        }
        Integer this$task_status = this.getTask_status();
        Integer other$task_status = other.getTask_status();
        if (this$task_status == null ? other$task_status != null : !((Object)this$task_status).equals(other$task_status)) {
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
        JSONArray this$DI = this.getDI();
        JSONArray other$DI = other.getDI();
        if (this$DI == null ? other$DI != null : !this$DI.equals(other$DI)) {
            return false;
        }
        JSONArray this$DO = this.getDO();
        JSONArray other$DO = other.getDO();
        if (this$DO == null ? other$DO != null : !this$DO.equals(other$DO)) {
            return false;
        }
        JSONArray this$errors = this.getErrors();
        JSONArray other$errors = other.getErrors();
        if (this$errors == null ? other$errors != null : !this$errors.equals(other$errors)) {
            return false;
        }
        String this$current_map = this.getCurrent_map();
        String other$current_map = other.getCurrent_map();
        if (this$current_map == null ? other$current_map != null : !this$current_map.equals(other$current_map)) {
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
        return !(this$state == null ? other$state != null : !this$state.equals(other$state));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotInfoVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $dispatchable = this.getDispatchable();
        result = result * 59 + ($dispatchable == null ? 43 : ((Object)$dispatchable).hashCode());
        Integer $dispatchable_status = this.getDispatchable_status();
        result = result * 59 + ($dispatchable_status == null ? 43 : ((Object)$dispatchable_status).hashCode());
        Boolean $current_map_invalid = this.getCurrent_map_invalid();
        result = result * 59 + ($current_map_invalid == null ? 43 : ((Object)$current_map_invalid).hashCode());
        Boolean $disconnect = this.getDisconnect();
        result = result * 59 + ($disconnect == null ? 43 : ((Object)$disconnect).hashCode());
        Boolean $low_battery = this.getLow_battery();
        result = result * 59 + ($low_battery == null ? 43 : ((Object)$low_battery).hashCode());
        Boolean $unconfirmed_reloc = this.getUnconfirmed_reloc();
        result = result * 59 + ($unconfirmed_reloc == null ? 43 : ((Object)$unconfirmed_reloc).hashCode());
        Integer $unlock = this.getUnlock();
        result = result * 59 + ($unlock == null ? 43 : ((Object)$unlock).hashCode());
        Double $battery_level = this.getBattery_level();
        result = result * 59 + ($battery_level == null ? 43 : ((Object)$battery_level).hashCode());
        Double $confidence = this.getConfidence();
        result = result * 59 + ($confidence == null ? 43 : ((Object)$confidence).hashCode());
        Integer $reloc_status = this.getReloc_status();
        result = result * 59 + ($reloc_status == null ? 43 : ((Object)$reloc_status).hashCode());
        Integer $task_status = this.getTask_status();
        result = result * 59 + ($task_status == null ? 43 : ((Object)$task_status).hashCode());
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $currentGroup = this.getCurrentGroup();
        result = result * 59 + ($currentGroup == null ? 43 : $currentGroup.hashCode());
        JSONArray $DI = this.getDI();
        result = result * 59 + ($DI == null ? 43 : $DI.hashCode());
        JSONArray $DO = this.getDO();
        result = result * 59 + ($DO == null ? 43 : $DO.hashCode());
        JSONArray $errors = this.getErrors();
        result = result * 59 + ($errors == null ? 43 : $errors.hashCode());
        String $current_map = this.getCurrent_map();
        result = result * 59 + ($current_map == null ? 43 : $current_map.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        String $out_order_no = this.getOut_order_no();
        result = result * 59 + ($out_order_no == null ? 43 : $out_order_no.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        return result;
    }

    public String toString() {
        return "RobotInfoVo(uuid=" + this.getUuid() + ", ip=" + this.getIp() + ", currentGroup=" + this.getCurrentGroup() + ", dispatchable=" + this.getDispatchable() + ", dispatchable_status=" + this.getDispatchable_status() + ", current_map_invalid=" + this.getCurrent_map_invalid() + ", disconnect=" + this.getDisconnect() + ", low_battery=" + this.getLow_battery() + ", unconfirmed_reloc=" + this.getUnconfirmed_reloc() + ", unlock=" + this.getUnlock() + ", DI=" + this.getDI() + ", DO=" + this.getDO() + ", errors=" + this.getErrors() + ", battery_level=" + this.getBattery_level() + ", confidence=" + this.getConfidence() + ", reloc_status=" + this.getReloc_status() + ", task_status=" + this.getTask_status() + ", current_map=" + this.getCurrent_map() + ", orderId=" + this.getOrderId() + ", out_order_no=" + this.getOut_order_no() + ", state=" + this.getState() + ")";
    }

    public RobotInfoVo(String uuid, String ip, String currentGroup, Boolean dispatchable, Integer dispatchable_status, Boolean current_map_invalid, Boolean disconnect, Boolean low_battery, Boolean unconfirmed_reloc, Integer unlock, JSONArray DI, JSONArray DO, JSONArray errors, Double battery_level, Double confidence, Integer reloc_status, Integer task_status, String current_map, String orderId, String out_order_no, String state) {
        this.uuid = uuid;
        this.ip = ip;
        this.currentGroup = currentGroup;
        this.dispatchable = dispatchable;
        this.dispatchable_status = dispatchable_status;
        this.current_map_invalid = current_map_invalid;
        this.disconnect = disconnect;
        this.low_battery = low_battery;
        this.unconfirmed_reloc = unconfirmed_reloc;
        this.unlock = unlock;
        this.DI = DI;
        this.DO = DO;
        this.errors = errors;
        this.battery_level = battery_level;
        this.confidence = confidence;
        this.reloc_status = reloc_status;
        this.task_status = task_status;
        this.current_map = current_map;
        this.orderId = orderId;
        this.out_order_no = out_order_no;
        this.state = state;
    }

    public RobotInfoVo() {
    }
}

