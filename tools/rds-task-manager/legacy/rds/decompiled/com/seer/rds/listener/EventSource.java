/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.MoniterListener
 *  com.seer.rds.listener.WindEvent
 *  javax.annotation.Resource
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.listener;

import com.seer.rds.listener.MoniterListener;
import com.seer.rds.listener.WindEvent;
import java.util.List;
import javax.annotation.Resource;
import org.springframework.stereotype.Component;

@Component
public class EventSource {
    @Resource
    private List<MoniterListener> listeners;

    public void addListener(MoniterListener listener) {
        this.listeners.add(listener);
    }

    public void removeListener(MoniterListener listener) {
        int i = this.listeners.indexOf(listener);
        if (i >= 0) {
            this.listeners.remove(listener);
        }
    }

    public void notify(WindEvent event) {
        if (this.listeners != null && this.listeners.size() > 0) {
            for (MoniterListener listener : this.listeners) {
                new Thread((Runnable)new /* Unavailable Anonymous Inner Class!! */).start();
            }
        }
    }
}

