/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TestRecordMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.service.factory.RecordUpdater
 *  com.seer.rds.service.factory.TestRecordUpdater
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.dao.TestRecordMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TestRecord;
import com.seer.rds.service.factory.RecordUpdater;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TestRecordUpdater
implements RecordUpdater {
    @Autowired
    private TestRecordMapper testRecordMapper;

    public void updateRecord(BaseRecord record) {
        this.testRecordMapper.save((Object)((TestRecord)record));
    }
}

