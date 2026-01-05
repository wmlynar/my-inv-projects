/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SysAlarmMapper
 *  com.seer.rds.model.admin.SysAlarm
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.SysAlarm;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface SysAlarmMapper
extends JpaRepository<SysAlarm, String> {
    public List<SysAlarm> findByCode(Integer var1);

    @Transactional
    public void deleteByCode(Integer var1);

    @Transactional
    @Modifying
    @Query(value="update SysAlarm alarm set alarm.level = :errorLevel ,alarm.message = :alarmMessage where alarm.code = :code")
    public void update(int var1, int var2, String var3);

    @Transactional
    public void deleteByIdentification(String var1);

    @Transactional
    public void deleteByIdentificationLike(String var1);

    @Transactional
    public int deleteSysAlarmsByCodeAndMessageIsLike(int var1, String var2);
}

