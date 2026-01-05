/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.factory.EventUpdater
 *  com.seer.rds.service.factory.InterfaceUpdater
 *  com.seer.rds.service.factory.RecordUpdater
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.factory.TaskRecordUpdater
 *  com.seer.rds.service.factory.TestRecordUpdater
 *  com.seer.rds.service.factory.TestUpdater
 *  com.seer.rds.util.SpringUtil
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.TestRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.factory.EventUpdater;
import com.seer.rds.service.factory.InterfaceUpdater;
import com.seer.rds.service.factory.RecordUpdater;
import com.seer.rds.service.factory.TaskRecordUpdater;
import com.seer.rds.service.factory.TestRecordUpdater;
import com.seer.rds.service.factory.TestUpdater;
import com.seer.rds.util.SpringUtil;
import org.springframework.stereotype.Component;

@Component
public class RecordUpdaterFactory {
    public static RecordUpdater getUpdater(BaseRecord record) {
        if (record instanceof WindTaskRecord) {
            record.setStatus(Integer.valueOf(Integer.parseInt(GlobalCacheConfig.getCache((String)(record.getDefId() + record.getId())).toString())));
            return (RecordUpdater)SpringUtil.getBean(TaskRecordUpdater.class);
        }
        if (record instanceof TestRecord) {
            record.setStatus(Integer.valueOf(Integer.parseInt(GlobalCacheConfig.getCache((String)(record.getDefId() + record.getId())).toString())));
            return (RecordUpdater)SpringUtil.getBean(TestRecordUpdater.class);
        }
        if (record instanceof InterfaceHandleRecord) {
            return (RecordUpdater)SpringUtil.getBean(InterfaceUpdater.class);
        }
        if (record instanceof EventRecord) {
            return (RecordUpdater)SpringUtil.getBean(EventUpdater.class);
        }
        if (record instanceof TestRecord) {
            return (RecordUpdater)SpringUtil.getBean(TestUpdater.class);
        }
        return null;
    }
}

