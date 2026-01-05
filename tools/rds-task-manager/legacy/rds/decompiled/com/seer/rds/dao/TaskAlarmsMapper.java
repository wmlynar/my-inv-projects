/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TaskAlarmsMapper
 *  com.seer.rds.model.alarms.TaskAlarms
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.alarms.TaskAlarms;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskAlarmsMapper
extends JpaRepository<TaskAlarms, String>,
JpaSpecificationExecutor<TaskAlarms> {
    public TaskAlarms findTaskAlarmsByMislabelingEqualsAndRecordMarkEquals(String var1, Integer var2);

    public List<TaskAlarms> findAllByRecordMarkEquals(int var1);

    public List<TaskAlarms> findAllByIsOkEquals(int var1);
}

