/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.queue.WindOrderQueue
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.queue;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class WindOrderQueue {
    private static final Logger log = LoggerFactory.getLogger(WindOrderQueue.class);
    private static BlockingQueue<Object> orderQueue = new LinkedBlockingQueue();
    private static ConcurrentHashMap<String, Object> extParam = new ConcurrentHashMap();

    public static void receiveOrder(String order) {
        try {
            orderQueue.put(order);
        }
        catch (InterruptedException e) {
            log.error("receive;Order error", (Throwable)e);
        }
    }

    public static Object sendOrder() {
        try {
            return orderQueue.take();
        }
        catch (InterruptedException e) {
            log.error("sendOrder error", (Throwable)e);
            return null;
        }
    }

    public static void putExtParam(String key, Object value) {
        extParam.put(key, value);
    }

    public static Object getExtParam(String key) {
        return extParam.get(key);
    }
}

