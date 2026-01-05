/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.threadPool.MyBlockingQueue
 *  com.seer.rds.service.threadPool.MyRejected
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.service.threadPool;

import com.seer.rds.service.threadPool.MyBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MyRejected
implements RejectedExecutionHandler {
    private static final Logger log = LoggerFactory.getLogger(MyRejected.class);
    private MyBlockingQueue blockingQueue;

    public MyRejected(MyBlockingQueue blockingQueue) {
        this.blockingQueue = blockingQueue;
    }

    @Override
    public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
        if (!this.blockingQueue.myoffer(r)) {
            throw new RejectedExecutionException("Queue is full");
        }
        log.info("insert queue success");
    }
}

