/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.service.factory.EventUpdater
 *  com.seer.rds.service.factory.RecordUpdater
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.dao.EventRecordMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.service.factory.RecordUpdater;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class EventUpdater
implements RecordUpdater {
    @Autowired
    private EventRecordMapper eventRecordMapper;

    public void updateRecord(BaseRecord record) {
        this.eventRecordMapper.save((Object)((EventRecord)record));
    }
}

