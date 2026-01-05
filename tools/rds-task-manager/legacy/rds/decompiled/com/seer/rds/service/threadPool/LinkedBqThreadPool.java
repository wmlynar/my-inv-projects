/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.util.concurrent.ThreadFactoryBuilder
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool$LinkedBqThreadPoolHolder
 *  org.jboss.logging.Logger
 */
package com.seer.rds.service.threadPool;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.jboss.logging.Logger;

public class LinkedBqThreadPool
extends ThreadPoolExecutor {
    private static ThreadFactory namedThreadFactory = new ThreadFactoryBuilder().setNameFormat("task-pool-%d").build();
    protected Logger log = Logger.getLogger(this.getClass());
    private AtomicInteger taskNum = new AtomicInteger(0);

    public static LinkedBqThreadPool getInstance() {
        return LinkedBqThreadPoolHolder.linkedBqThreadPoolInstance;
    }

    private LinkedBqThreadPool(int corePoolSize, int maximumPoolSize, long keepActiveTime, TimeUnit timeunit, BlockingQueue<Runnable> blockingqueue, RejectedExecutionHandler reject) {
        super(corePoolSize, maximumPoolSize, keepActiveTime, timeunit, blockingqueue, namedThreadFactory, reject);
    }

    @Override
    public void execute(Runnable task) {
        this.taskNum.getAndIncrement();
        super.execute(task);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void afterExecute(Runnable task, Throwable throwable) {
        this.taskNum.decrementAndGet();
        this.log.debug((Object)("task : " + task.getClass().getSimpleName() + " completed,Throwable:" + throwable + ",taskNum:" + this.getTaskNum()));
        LinkedBqThreadPool linkedBqThreadPool = this;
        synchronized (linkedBqThreadPool) {
            this.notifyAll();
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void waitComplete() {
        try {
            LinkedBqThreadPool linkedBqThreadPool = this;
            synchronized (linkedBqThreadPool) {
                while (this.getTaskNum() > 0) {
                    this.wait(500L);
                }
            }
        }
        catch (InterruptedException e) {
            this.log.error((Object)(e + ", taskNum:" + this.getTaskNum()));
        }
    }

    public int getTaskNum() {
        return this.taskNum.get();
    }

    public void setKeepAliveTime(int time) {
        super.setKeepAliveTime(time, TimeUnit.SECONDS);
    }

    @Override
    public void setCorePoolSize(int size) {
        super.setCorePoolSize(size);
    }

    @Override
    public void setMaximumPoolSize(int size) {
        super.setMaximumPoolSize(size);
    }
}

