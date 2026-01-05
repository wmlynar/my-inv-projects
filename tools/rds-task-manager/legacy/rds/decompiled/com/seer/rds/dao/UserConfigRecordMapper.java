/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.UserConfigRecordMapper
 *  com.seer.rds.model.admin.UserConfigRecord
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.stereotype.Repository
 */
package com.seer.rds.dao;

import com.seer.rds.model.admin.UserConfigRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserConfigRecordMapper
extends JpaRepository<UserConfigRecord, String> {
    public UserConfigRecord findUserConfigRecordByUserIdAndUserKey(String var1, String var2);

    public List<UserConfigRecord> findUserConfigRecordByUserKey(String var1);
}

