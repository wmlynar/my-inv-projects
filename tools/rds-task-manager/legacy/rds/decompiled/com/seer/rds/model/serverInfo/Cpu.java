/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.Cpu
 *  com.seer.rds.util.server.Arith
 */
package com.seer.rds.model.serverInfo;

import com.seer.rds.util.server.Arith;

public class Cpu {
    private int cpuNum;
    private double total;
    private double sys;
    private double used;
    private double wait;
    private double free;

    public int getCpuNum() {
        return this.cpuNum;
    }

    public void setCpuNum(int cpuNum) {
        this.cpuNum = cpuNum;
    }

    public double getTotal() {
        return Arith.round((double)Arith.mul((double)this.total, (double)100.0), (int)2);
    }

    public void setTotal(double total) {
        this.total = total;
    }

    public double getSys() {
        return Arith.round((double)Arith.mul((double)(this.sys / this.total), (double)100.0), (int)2);
    }

    public void setSys(double sys) {
        this.sys = sys;
    }

    public double getUsed() {
        return Arith.round((double)Arith.mul((double)(this.used / this.total), (double)100.0), (int)2);
    }

    public void setUsed(double used) {
        this.used = used;
    }

    public double getWait() {
        return Arith.round((double)Arith.mul((double)(this.wait / this.total), (double)100.0), (int)2);
    }

    public void setWait(double wait) {
        this.wait = wait;
    }

    public double getFree() {
        return Arith.round((double)Arith.mul((double)(this.free / this.total), (double)100.0), (int)2);
    }

    public void setFree(double free) {
        this.free = free;
    }
}

