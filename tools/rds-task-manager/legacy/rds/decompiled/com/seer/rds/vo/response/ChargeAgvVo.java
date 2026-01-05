/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.ChargeAgvVo
 *  com.seer.rds.vo.response.ChargeAgvVo$ChargeAgvVoBuilder
 *  com.seer.rds.vo.response.ChargeAgvVo$Params
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.ChargeAgvVo;
import java.math.BigDecimal;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class ChargeAgvVo {
    private static final Logger log = LoggerFactory.getLogger(ChargeAgvVo.class);
    private String vehicle;
    private Params params;

    public static ChargeAgvVo buildChargeVo(String name, Map<String, BigDecimal> paramsMap) {
        return ChargeAgvVo.builder().vehicle(name).params(Params.buildParams(paramsMap)).build();
    }

    public static ChargeAgvVoBuilder builder() {
        return new ChargeAgvVoBuilder();
    }

    public String getVehicle() {
        return this.vehicle;
    }

    public Params getParams() {
        return this.params;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setParams(Params params) {
        this.params = params;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChargeAgvVo)) {
            return false;
        }
        ChargeAgvVo other = (ChargeAgvVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        Params this$params = this.getParams();
        Params other$params = other.getParams();
        return !(this$params == null ? other$params != null : !this$params.equals(other$params));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChargeAgvVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        Params $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : $params.hashCode());
        return result;
    }

    public String toString() {
        return "ChargeAgvVo(vehicle=" + this.getVehicle() + ", params=" + this.getParams() + ")";
    }

    public ChargeAgvVo(String vehicle, Params params) {
        this.vehicle = vehicle;
        this.params = params;
    }

    public ChargeAgvVo() {
    }
}

