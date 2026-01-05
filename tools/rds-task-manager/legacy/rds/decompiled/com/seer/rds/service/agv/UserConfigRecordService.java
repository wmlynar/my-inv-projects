/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.UserConfigRecordMapper
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.service.agv.UserConfigRecordService
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.UserConfigRecordMapper;
import com.seer.rds.model.admin.UserConfigRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserConfigRecordService {
    @Autowired
    private UserConfigRecordMapper userConfigRecordMapper;

    @Transactional
    public UserConfigRecord findUserConfigRecordByuserIdAnduserKey(String userId, String userKey) {
        UserConfigRecord user = this.userConfigRecordMapper.findUserConfigRecordByUserIdAndUserKey(userId, userKey);
        if (user != null) {
            return user;
        }
        return null;
    }

    @Transactional
    public void saveUserConfig(UserConfigRecord userConfigRecord) {
        this.userConfigRecordMapper.save((Object)userConfigRecord);
    }
}

