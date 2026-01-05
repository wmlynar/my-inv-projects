/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.script.ScriptLock
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.script;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ScriptLock {
    private static final Logger log = LoggerFactory.getLogger(ScriptLock.class);
    private static Map<String, Boolean> mapBoolean = Collections.synchronizedMap(new HashMap());

    private ScriptLock() {
    }

    public static synchronized Boolean lock(String key) {
        log.info("Script Lock LockMap {}", (Object)mapBoolean);
        Boolean value = (Boolean)mapBoolean.get(key);
        if (value == null) {
            mapBoolean.put(key, true);
            return true;
        }
        if (!value.booleanValue()) {
            mapBoolean.put(key, true);
        }
        return value == false;
    }

    public static Boolean unLock(String key) {
        log.info("Script Lock unLockMap {}", (Object)mapBoolean);
        Boolean value = (Boolean)mapBoolean.get(key);
        if (value != null) {
            return mapBoolean.replace(key, true, false);
        }
        return true;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptLock)) {
            return false;
        }
        ScriptLock other = (ScriptLock)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptLock;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "ScriptLock()";
    }
}

