/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.AreaResourcesOccupiedVo
 *  com.seer.rds.vo.core.BasicInfoVo
 *  com.seer.rds.vo.core.ChassisVo
 *  com.seer.rds.vo.core.CurrentOrderVo
 *  com.seer.rds.vo.core.LockInfoVo
 *  com.seer.rds.vo.core.RbkReportVo
 *  com.seer.rds.vo.core.ReportVo
 *  com.seer.rds.vo.core.UndispatchableReasonVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.core.AreaResourcesOccupiedVo;
import com.seer.rds.vo.core.BasicInfoVo;
import com.seer.rds.vo.core.ChassisVo;
import com.seer.rds.vo.core.CurrentOrderVo;
import com.seer.rds.vo.core.LockInfoVo;
import com.seer.rds.vo.core.RbkReportVo;
import com.seer.rds.vo.core.UndispatchableReasonVo;
import io.swagger.annotations.ApiModel;
import java.util.List;

@ApiModel(value=" report \u5bf9\u8c61")
public class ReportVo {
    private List<AreaResourcesOccupiedVo> area_resources_occupied;
    private BasicInfoVo basic_info;
    private ChassisVo chassis;
    private Integer connection_status;
    private CurrentOrderVo current_order;
    private Boolean dispatchable;
    private Boolean procBusiness;
    private LockInfoVo lock_info;
    private RbkReportVo rbk_report;
    private UndispatchableReasonVo undispatchable_reason;
    private String uuid;
    private String vehicle_id;

    public List<AreaResourcesOccupiedVo> getArea_resources_occupied() {
        return this.area_resources_occupied;
    }

    public BasicInfoVo getBasic_info() {
        return this.basic_info;
    }

    public ChassisVo getChassis() {
        return this.chassis;
    }

    public Integer getConnection_status() {
        return this.connection_status;
    }

    public CurrentOrderVo getCurrent_order() {
        return this.current_order;
    }

    public Boolean getDispatchable() {
        return this.dispatchable;
    }

    public Boolean getProcBusiness() {
        return this.procBusiness;
    }

    public LockInfoVo getLock_info() {
        return this.lock_info;
    }

    public RbkReportVo getRbk_report() {
        return this.rbk_report;
    }

    public UndispatchableReasonVo getUndispatchable_reason() {
        return this.undispatchable_reason;
    }

    public String getUuid() {
        return this.uuid;
    }

    public String getVehicle_id() {
        return this.vehicle_id;
    }

    public void setArea_resources_occupied(List<AreaResourcesOccupiedVo> area_resources_occupied) {
        this.area_resources_occupied = area_resources_occupied;
    }

    public void setBasic_info(BasicInfoVo basic_info) {
        this.basic_info = basic_info;
    }

    public void setChassis(ChassisVo chassis) {
        this.chassis = chassis;
    }

    public void setConnection_status(Integer connection_status) {
        this.connection_status = connection_status;
    }

    public void setCurrent_order(CurrentOrderVo current_order) {
        this.current_order = current_order;
    }

    public void setDispatchable(Boolean dispatchable) {
        this.dispatchable = dispatchable;
    }

    public void setProcBusiness(Boolean procBusiness) {
        this.procBusiness = procBusiness;
    }

    public void setLock_info(LockInfoVo lock_info) {
        this.lock_info = lock_info;
    }

    public void setRbk_report(RbkReportVo rbk_report) {
        this.rbk_report = rbk_report;
    }

    public void setUndispatchable_reason(UndispatchableReasonVo undispatchable_reason) {
        this.undispatchable_reason = undispatchable_reason;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setVehicle_id(String vehicle_id) {
        this.vehicle_id = vehicle_id;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ReportVo)) {
            return false;
        }
        ReportVo other = (ReportVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$connection_status = this.getConnection_status();
        Integer other$connection_status = other.getConnection_status();
        if (this$connection_status == null ? other$connection_status != null : !((Object)this$connection_status).equals(other$connection_status)) {
            return false;
        }
        Boolean this$dispatchable = this.getDispatchable();
        Boolean other$dispatchable = other.getDispatchable();
        if (this$dispatchable == null ? other$dispatchable != null : !((Object)this$dispatchable).equals(other$dispatchable)) {
            return false;
        }
        Boolean this$procBusiness = this.getProcBusiness();
        Boolean other$procBusiness = other.getProcBusiness();
        if (this$procBusiness == null ? other$procBusiness != null : !((Object)this$procBusiness).equals(other$procBusiness)) {
            return false;
        }
        List this$area_resources_occupied = this.getArea_resources_occupied();
        List other$area_resources_occupied = other.getArea_resources_occupied();
        if (this$area_resources_occupied == null ? other$area_resources_occupied != null : !((Object)this$area_resources_occupied).equals(other$area_resources_occupied)) {
            return false;
        }
        BasicInfoVo this$basic_info = this.getBasic_info();
        BasicInfoVo other$basic_info = other.getBasic_info();
        if (this$basic_info == null ? other$basic_info != null : !this$basic_info.equals(other$basic_info)) {
            return false;
        }
        ChassisVo this$chassis = this.getChassis();
        ChassisVo other$chassis = other.getChassis();
        if (this$chassis == null ? other$chassis != null : !this$chassis.equals(other$chassis)) {
            return false;
        }
        CurrentOrderVo this$current_order = this.getCurrent_order();
        CurrentOrderVo other$current_order = other.getCurrent_order();
        if (this$current_order == null ? other$current_order != null : !this$current_order.equals(other$current_order)) {
            return false;
        }
        LockInfoVo this$lock_info = this.getLock_info();
        LockInfoVo other$lock_info = other.getLock_info();
        if (this$lock_info == null ? other$lock_info != null : !this$lock_info.equals(other$lock_info)) {
            return false;
        }
        RbkReportVo this$rbk_report = this.getRbk_report();
        RbkReportVo other$rbk_report = other.getRbk_report();
        if (this$rbk_report == null ? other$rbk_report != null : !this$rbk_report.equals(other$rbk_report)) {
            return false;
        }
        UndispatchableReasonVo this$undispatchable_reason = this.getUndispatchable_reason();
        UndispatchableReasonVo other$undispatchable_reason = other.getUndispatchable_reason();
        if (this$undispatchable_reason == null ? other$undispatchable_reason != null : !this$undispatchable_reason.equals(other$undispatchable_reason)) {
            return false;
        }
        String this$uuid = this.getUuid();
        String other$uuid = other.getUuid();
        if (this$uuid == null ? other$uuid != null : !this$uuid.equals(other$uuid)) {
            return false;
        }
        String this$vehicle_id = this.getVehicle_id();
        String other$vehicle_id = other.getVehicle_id();
        return !(this$vehicle_id == null ? other$vehicle_id != null : !this$vehicle_id.equals(other$vehicle_id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ReportVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $connection_status = this.getConnection_status();
        result = result * 59 + ($connection_status == null ? 43 : ((Object)$connection_status).hashCode());
        Boolean $dispatchable = this.getDispatchable();
        result = result * 59 + ($dispatchable == null ? 43 : ((Object)$dispatchable).hashCode());
        Boolean $procBusiness = this.getProcBusiness();
        result = result * 59 + ($procBusiness == null ? 43 : ((Object)$procBusiness).hashCode());
        List $area_resources_occupied = this.getArea_resources_occupied();
        result = result * 59 + ($area_resources_occupied == null ? 43 : ((Object)$area_resources_occupied).hashCode());
        BasicInfoVo $basic_info = this.getBasic_info();
        result = result * 59 + ($basic_info == null ? 43 : $basic_info.hashCode());
        ChassisVo $chassis = this.getChassis();
        result = result * 59 + ($chassis == null ? 43 : $chassis.hashCode());
        CurrentOrderVo $current_order = this.getCurrent_order();
        result = result * 59 + ($current_order == null ? 43 : $current_order.hashCode());
        LockInfoVo $lock_info = this.getLock_info();
        result = result * 59 + ($lock_info == null ? 43 : $lock_info.hashCode());
        RbkReportVo $rbk_report = this.getRbk_report();
        result = result * 59 + ($rbk_report == null ? 43 : $rbk_report.hashCode());
        UndispatchableReasonVo $undispatchable_reason = this.getUndispatchable_reason();
        result = result * 59 + ($undispatchable_reason == null ? 43 : $undispatchable_reason.hashCode());
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        String $vehicle_id = this.getVehicle_id();
        result = result * 59 + ($vehicle_id == null ? 43 : $vehicle_id.hashCode());
        return result;
    }

    public String toString() {
        return "ReportVo(area_resources_occupied=" + this.getArea_resources_occupied() + ", basic_info=" + this.getBasic_info() + ", chassis=" + this.getChassis() + ", connection_status=" + this.getConnection_status() + ", current_order=" + this.getCurrent_order() + ", dispatchable=" + this.getDispatchable() + ", procBusiness=" + this.getProcBusiness() + ", lock_info=" + this.getLock_info() + ", rbk_report=" + this.getRbk_report() + ", undispatchable_reason=" + this.getUndispatchable_reason() + ", uuid=" + this.getUuid() + ", vehicle_id=" + this.getVehicle_id() + ")";
    }

    public ReportVo(List<AreaResourcesOccupiedVo> area_resources_occupied, BasicInfoVo basic_info, ChassisVo chassis, Integer connection_status, CurrentOrderVo current_order, Boolean dispatchable, Boolean procBusiness, LockInfoVo lock_info, RbkReportVo rbk_report, UndispatchableReasonVo undispatchable_reason, String uuid, String vehicle_id) {
        this.area_resources_occupied = area_resources_occupied;
        this.basic_info = basic_info;
        this.chassis = chassis;
        this.connection_status = connection_status;
        this.current_order = current_order;
        this.dispatchable = dispatchable;
        this.procBusiness = procBusiness;
        this.lock_info = lock_info;
        this.rbk_report = rbk_report;
        this.undispatchable_reason = undispatchable_reason;
        this.uuid = uuid;
        this.vehicle_id = vehicle_id;
    }

    public ReportVo() {
    }
}

