/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdater
 *  com.seer.rds.service.factory.TaskRecordUpdater
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.factory;

import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdater;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TaskRecordUpdater
implements RecordUpdater {
    @Autowired
    private WindService windService;

    public void updateRecord(BaseRecord record) {
        this.windService.updateTaskRecord((WindTaskRecord)record);
    }
}

