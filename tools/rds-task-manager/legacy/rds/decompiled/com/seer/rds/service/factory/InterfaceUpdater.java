/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.InterfaceHandleRecordMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.service.factory.InterfaceUpdater
 *  com.seer.rds.service.factory.RecordUpdater
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.dao.InterfaceHandleRecordMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.service.factory.RecordUpdater;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class InterfaceUpdater
implements RecordUpdater {
    @Autowired
    protected InterfaceHandleRecordMapper interfaceHandleRecordMapper;

    public void updateRecord(BaseRecord record) {
        this.interfaceHandleRecordMapper.save((Object)((InterfaceHandleRecord)record));
    }
}

