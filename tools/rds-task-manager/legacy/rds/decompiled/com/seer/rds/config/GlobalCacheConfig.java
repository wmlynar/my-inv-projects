/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.vo.wind.TaskErrorVo
 */
package com.seer.rds.config;

import com.seer.rds.vo.wind.TaskErrorVo;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

public class GlobalCacheConfig {
    public static final String robotStatusCacheKey = "robotsStatus";
    public static final String websocketCacheKey = "websocketCacheKey";
    public static final String scriptLogCacheKey = "scriptLogCacheKey";
    public static final String sceneMd5CacheKey = "sceneMd5CacheKey";
    public static final String SuspendKey = "SuspendKey";
    public static final String StopBranchKey = "StopBranchKey";
    public static final String RevertJumpKey = "RevertJumpKey";
    public static final String ManualEndKey = "ManualEndKey";
    public static final String RedoFailedOrder = "RedoFailedOrder";
    private static final String COMPONENT_SKIP_KEY = "componentSkip:";
    private static ConcurrentHashMap<String, TaskErrorVo> taskErrorCacheMap = new ConcurrentHashMap();
    private static ConcurrentHashMap<String, Object> cacheMap = new ConcurrentHashMap();
    private static ConcurrentHashMap<String, String> cacheInterruptMap = new ConcurrentHashMap();
    private static ConcurrentHashMap<Integer, Boolean> cacheIfPop = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, List<Thread>> cacheThreadMap = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, ConcurrentHashMap<String, Object>> cacheBlockIfResetMap = new ConcurrentHashMap();
    public static final String isAgvActionDone = "isAgvActionDone";

    public static void cacheIfPop(Integer key, Boolean value) {
        cacheIfPop.put(key, value);
    }

    public static Boolean getcacheIfPop(Integer key) {
        return (Boolean)cacheIfPop.get(key);
    }

    public static void clearcacheIfPop(Integer key) {
        if (cacheIfPop.containsKey(key)) {
            cacheIfPop.remove(key);
        }
    }

    public static void cache(String key, Object value) {
        cacheMap.put(key, value);
    }

    public static void cacheSkip(String key, Object value) {
        cacheMap.put(key + COMPONENT_SKIP_KEY, value);
    }

    public static Object getCache(String key) {
        return cacheMap.get(key);
    }

    public static Object getCacheSkip(String key) {
        return cacheMap.get(key + COMPONENT_SKIP_KEY);
    }

    public static void clearCache(String key) {
        if (cacheMap.containsKey(key)) {
            cacheMap.remove(key);
        }
    }

    public static void clearCacheSkip(String key) {
        if (cacheMap.containsKey(key + COMPONENT_SKIP_KEY)) {
            cacheMap.remove(key + COMPONENT_SKIP_KEY);
        }
    }

    public static void taskErrorCache(String key, TaskErrorVo value) {
        taskErrorCacheMap.put(key, value);
    }

    public static TaskErrorVo getTaskErrorCache(String key) {
        return (TaskErrorVo)taskErrorCacheMap.get(key);
    }

    public static ConcurrentHashMap<String, TaskErrorVo> getAllTaskErrorCache() {
        return taskErrorCacheMap;
    }

    public static void clearTaskErrorCache(String key) {
        if (taskErrorCacheMap.containsKey(key)) {
            taskErrorCacheMap.remove(key);
        }
    }

    public static void clearTaskErrorCacheByContainsPrefix(String prefix) {
        taskErrorCacheMap.forEach((key, value) -> {
            if (key.startsWith(prefix)) {
                taskErrorCacheMap.remove(key);
            }
        });
    }

    public static void cacheThread(String key, List value) {
        cacheThreadMap.put(key, value);
    }

    public static List<Thread> getCacheThread(String key) {
        return (List)cacheThreadMap.get(key);
    }

    public static void clearCacheThread(String key) {
        if (cacheThreadMap.containsKey(key)) {
            cacheThreadMap.remove(key);
        }
    }

    public static void cacheInterrupt(String key, String value) {
        cacheInterruptMap.put(key, value);
    }

    public static String getCacheInterrupt(String key) {
        return (String)cacheInterruptMap.get(key);
    }

    public static void clearCacheInterrupt(String key) {
        if (cacheInterruptMap.containsKey(key)) {
            cacheInterruptMap.remove(key);
        }
    }

    public static void cacheBlockIfResetMap(String key, ConcurrentHashMap<String, Object> value) {
        cacheBlockIfResetMap.put(key, value);
    }

    public static ConcurrentHashMap<String, Object> getCacheBlockIfResetMap(String key) {
        return (ConcurrentHashMap)cacheBlockIfResetMap.get(key);
    }

    public static void clearCacheBlockIfResetMap(String key) {
        if (cacheBlockIfResetMap.containsKey(key)) {
            cacheBlockIfResetMap.remove(key);
        }
    }
}

