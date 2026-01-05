/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.Mem
 *  com.seer.rds.util.server.Arith
 */
package com.seer.rds.model.serverInfo;

import com.seer.rds.util.server.Arith;

public class Mem {
    private double total;
    private double used;
    private double free;

    public double getTotal() {
        return Arith.div((double)this.total, (double)1.073741824E9, (int)2);
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public double getUsed() {
        return Arith.div((double)this.used, (double)1.073741824E9, (int)2);
    }

    public void setUsed(long used) {
        this.used = used;
    }

    public double getFree() {
        return Arith.div((double)this.free, (double)1.073741824E9, (int)2);
    }

    public void setFree(long free) {
        this.free = free;
    }

    public double getUsage() {
        return Arith.mul((double)Arith.div((double)this.used, (double)this.total, (int)4), (double)100.0);
    }
}

