/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.WindBlockVo
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 */
package com.seer.rds.util;

import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.WindBlockVo;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;

public class BlockStatusUtils {
    public static String getBlockStatus(BaseRecord taskRecord, WindBlockVo blockVo) {
        ConcurrentHashMap cacheBlockIfResetMap;
        String state = "";
        String taskRecordId = taskRecord.getId();
        if (!"".equals(taskRecordId) && taskRecordId != null && (cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)taskRecordId)) != null) {
            String restart = (String)cacheBlockIfResetMap.get("restart");
            String rootblockState = (String)cacheBlockIfResetMap.get(blockVo.getBlockId().toString());
            if (restart == "restart" && rootblockState != null) {
                state = rootblockState;
            }
        }
        return state;
    }

    public static void ClearBlockStaus(BaseRecord taskRecord, String str) {
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)taskRecord.getId());
        cacheBlockIfResetMap.put(str, "");
        GlobalCacheConfig.cacheBlockIfResetMap((String)taskRecord.getId(), (ConcurrentHashMap)cacheBlockIfResetMap);
    }

    public static void getBlockRecord(BaseRecord taskRecord, WindBlockVo blockVo, WindBlockRecord blockRecord) {
        List collect;
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)taskRecord.getId());
        if (cacheBlockIfResetMap == null) {
            return;
        }
        WindBlockRecordMapper windBlockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
        List windBlockRecord = windBlockRecordMapper.findWindBlockRecordByTaskRecordIdAndBlockConfigIdAndStatusInAndOrderIdNotNull(taskRecord.getId(), String.valueOf(blockVo.getBlockId()), Arrays.asList(1000, 1002, 1005, 1007));
        if (CollectionUtils.isNotEmpty((Collection)windBlockRecord) && CollectionUtils.isNotEmpty(collect = windBlockRecord.stream().filter(it -> StringUtils.isNotEmpty((CharSequence)it.getOrderId())).collect(Collectors.toList()))) {
            blockRecord.setOrderId(((WindBlockRecord)collect.get(0)).getOrderId());
        }
    }
}

