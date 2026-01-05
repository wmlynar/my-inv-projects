/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ChargeConfigReq
 *  com.seer.rds.vo.req.ChargeModelReq
 *  com.seer.rds.vo.req.ChargerReportsReq
 *  com.seer.rds.vo.req.ChargevehicleInfoReq
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.ChargeConfigReq;
import com.seer.rds.vo.req.ChargerReportsReq;
import com.seer.rds.vo.req.ChargevehicleInfoReq;

public class ChargeModelReq {
    public ChargeConfigReq config;
    public ChargerReportsReq chargerReports;
    public ChargevehicleInfoReq vehicleInfo;
    public Boolean turnedOn;
    public Boolean enabled;
    public Boolean timedOut;
    public Boolean online;
    public Integer voltageToCharger;
    public Integer currentToCharger;
    public String status;
    public Boolean given;
}

