/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ActionVo
 *  com.seer.rds.vo.general.TransportModbusVo
 *  com.seer.rds.vo.general.TransportModbusVo$TransportModbusVoBuilder
 *  com.seer.rds.vo.general.VehicleVo
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ActionVo;
import com.seer.rds.vo.general.TransportModbusVo;
import com.seer.rds.vo.general.VehicleVo;
import java.util.ArrayList;
import java.util.List;

public class TransportModbusVo {
    private VehicleVo vehicle = new VehicleVo();
    private List<ActionVo> action = new ArrayList();

    public static TransportModbusVoBuilder builder() {
        return new TransportModbusVoBuilder();
    }

    public VehicleVo getVehicle() {
        return this.vehicle;
    }

    public List<ActionVo> getAction() {
        return this.action;
    }

    public void setVehicle(VehicleVo vehicle) {
        this.vehicle = vehicle;
    }

    public void setAction(List<ActionVo> action) {
        this.action = action;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TransportModbusVo)) {
            return false;
        }
        TransportModbusVo other = (TransportModbusVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        VehicleVo this$vehicle = this.getVehicle();
        VehicleVo other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        List this$action = this.getAction();
        List other$action = other.getAction();
        return !(this$action == null ? other$action != null : !((Object)this$action).equals(other$action));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TransportModbusVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        VehicleVo $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        List $action = this.getAction();
        result = result * 59 + ($action == null ? 43 : ((Object)$action).hashCode());
        return result;
    }

    public String toString() {
        return "TransportModbusVo(vehicle=" + this.getVehicle() + ", action=" + this.getAction() + ")";
    }

    public TransportModbusVo() {
    }

    public TransportModbusVo(VehicleVo vehicle, List<ActionVo> action) {
        this.vehicle = vehicle;
        this.action = action;
    }
}

