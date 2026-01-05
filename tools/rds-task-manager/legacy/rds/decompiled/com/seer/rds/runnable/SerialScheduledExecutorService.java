/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Maps
 *  com.seer.rds.runnable.SerialScheduledExecutorService
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import com.google.common.collect.Maps;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SerialScheduledExecutorService {
    private static final Logger log = LoggerFactory.getLogger(SerialScheduledExecutorService.class);
    private int threadsNum;
    private ScheduledExecutorService scheduledExecutor;
    private Map<String, Boolean> executing = Maps.newConcurrentMap();

    public SerialScheduledExecutorService(int threadsNum) {
        this.scheduledExecutor = Executors.newScheduledThreadPool(threadsNum);
    }

    public ScheduledFuture scheduleAtFixedRateSerially(String id, Runnable command, Long delay, Long period, TimeUnit timeUnit) {
        return this.scheduledExecutor.scheduleWithFixedDelay((Runnable)new /* Unavailable Anonymous Inner Class!! */, delay, period, timeUnit);
    }

    public ScheduledFuture scheduleAtFixedRate(Runnable command, Long delay, Long period, TimeUnit unit) {
        return this.scheduledExecutor.scheduleWithFixedDelay(command, delay, period, unit);
    }

    public void shutDown() {
        if (this.scheduledExecutor != null) {
            this.scheduledExecutor.shutdown();
        }
    }
}

