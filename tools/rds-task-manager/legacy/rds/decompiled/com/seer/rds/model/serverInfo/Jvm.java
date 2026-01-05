/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.Jvm
 *  com.seer.rds.util.server.Arith
 *  com.seer.rds.util.server.DateUtils
 */
package com.seer.rds.model.serverInfo;

import com.seer.rds.util.server.Arith;
import com.seer.rds.util.server.DateUtils;
import java.lang.management.ManagementFactory;
import java.util.Date;

public class Jvm {
    private double total;
    private double max;
    private double free;
    private String version;
    private String home;

    public double getTotal() {
        return Arith.div((double)this.total, (double)1048576.0, (int)2);
    }

    public void setTotal(double total) {
        this.total = total;
    }

    public double getMax() {
        return Arith.div((double)this.max, (double)1048576.0, (int)2);
    }

    public void setMax(double max) {
        this.max = max;
    }

    public double getFree() {
        return Arith.div((double)this.free, (double)1048576.0, (int)2);
    }

    public void setFree(double free) {
        this.free = free;
    }

    public double getUsed() {
        return Arith.div((double)(this.total - this.free), (double)1048576.0, (int)2);
    }

    public double getUsage() {
        return Arith.mul((double)Arith.div((double)(this.total - this.free), (double)this.total, (int)4), (double)100.0);
    }

    public String getName() {
        return ManagementFactory.getRuntimeMXBean().getVmName();
    }

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getHome() {
        return this.home;
    }

    public void setHome(String home) {
        this.home = home;
    }

    public String getStartTime() {
        return DateUtils.parseDateToStr((String)DateUtils.YYYY_MM_DD_HH_MM_SS, (Date)DateUtils.getServerStartDate());
    }

    public String getRunTime() {
        return DateUtils.getDatePoor((Date)DateUtils.getNowDate(), (Date)DateUtils.getServerStartDate());
    }

    public String getInputArgs() {
        return ManagementFactory.getRuntimeMXBean().getInputArguments().toString();
    }
}

