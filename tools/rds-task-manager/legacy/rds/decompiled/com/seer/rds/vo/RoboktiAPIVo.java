/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.RoboktiAPIVo
 */
package com.seer.rds.vo;

public class RoboktiAPIVo {
    private String vehicle;
    private Integer port;
    private Integer code;
    private Object cmd;

    public String getVehicle() {
        return this.vehicle;
    }

    public Integer getPort() {
        return this.port;
    }

    public Integer getCode() {
        return this.code;
    }

    public Object getCmd() {
        return this.cmd;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setCmd(Object cmd) {
        this.cmd = cmd;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RoboktiAPIVo)) {
            return false;
        }
        RoboktiAPIVo other = (RoboktiAPIVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        Integer this$code = this.getCode();
        Integer other$code = other.getCode();
        if (this$code == null ? other$code != null : !((Object)this$code).equals(other$code)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        Object this$cmd = this.getCmd();
        Object other$cmd = other.getCmd();
        return !(this$cmd == null ? other$cmd != null : !this$cmd.equals(other$cmd));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RoboktiAPIVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        Object $cmd = this.getCmd();
        result = result * 59 + ($cmd == null ? 43 : $cmd.hashCode());
        return result;
    }

    public String toString() {
        return "RoboktiAPIVo(vehicle=" + this.getVehicle() + ", port=" + this.getPort() + ", code=" + this.getCode() + ", cmd=" + this.getCmd() + ")";
    }
}

