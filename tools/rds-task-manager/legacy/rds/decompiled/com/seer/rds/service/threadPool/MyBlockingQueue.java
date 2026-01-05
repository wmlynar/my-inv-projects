/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.threadPool.MyBlockingQueue
 */
package com.seer.rds.service.threadPool;

import java.util.concurrent.ArrayBlockingQueue;

public class MyBlockingQueue
extends ArrayBlockingQueue {
    public MyBlockingQueue(int capacity) {
        super(capacity);
    }

    @Override
    public boolean offer(Object o) {
        return false;
    }

    public boolean myoffer(Runnable r) {
        return super.offer(r);
    }
}

