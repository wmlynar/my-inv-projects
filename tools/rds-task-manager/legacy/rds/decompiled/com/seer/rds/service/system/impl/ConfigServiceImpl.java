/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.UserConfigEnum
 *  com.seer.rds.dao.UserConfigRecordMapper
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.service.system.ConfigService
 *  com.seer.rds.service.system.impl.ConfigServiceImpl
 *  com.seer.rds.vo.req.UserMapConfigReq
 *  javax.transaction.Transactional
 *  org.apache.commons.collections.CollectionUtils
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.system.impl;

import com.seer.rds.constant.UserConfigEnum;
import com.seer.rds.dao.UserConfigRecordMapper;
import com.seer.rds.model.admin.UserConfigRecord;
import com.seer.rds.service.system.ConfigService;
import com.seer.rds.vo.req.UserMapConfigReq;
import java.util.Collection;
import java.util.List;
import javax.transaction.Transactional;
import org.apache.commons.collections.CollectionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ConfigServiceImpl
implements ConfigService {
    @Autowired
    private UserConfigRecordMapper userConfigRecordMapper;

    public UserConfigRecord getMapConfigByUserKey(String userKey) {
        List userConfigRecords = this.userConfigRecordMapper.findUserConfigRecordByUserKey(userKey);
        return CollectionUtils.isEmpty((Collection)userConfigRecords) ? null : (UserConfigRecord)userConfigRecords.get(0);
    }

    @Transactional
    public void saveMapConfig(UserMapConfigReq mapConfig) {
        UserConfigRecord userConfigRecord;
        List userConfigRecords = this.userConfigRecordMapper.findUserConfigRecordByUserKey(mapConfig.getUserKey());
        if (CollectionUtils.isNotEmpty((Collection)userConfigRecords)) {
            userConfigRecord = (UserConfigRecord)userConfigRecords.get(0);
            userConfigRecord.setUserValue(mapConfig.getUserValue());
        } else {
            userConfigRecord = UserConfigRecord.builder().userKey(mapConfig.getUserKey()).userValue(mapConfig.getUserValue()).build();
        }
        this.userConfigRecordMapper.save((Object)userConfigRecord);
    }

    public UserConfigRecord getTittleConfigByUserKey(String userKey) {
        List userConfigRecords = this.userConfigRecordMapper.findUserConfigRecordByUserKey(userKey);
        if (CollectionUtils.isEmpty((Collection)userConfigRecords)) {
            UserConfigRecord userConfigRecord = UserConfigRecord.builder().userKey(UserConfigEnum.cache_name.getKey()).userValue(UserConfigEnum.cache_name.getValue()).build();
            this.userConfigRecordMapper.save((Object)userConfigRecord);
            return userConfigRecord;
        }
        return (UserConfigRecord)userConfigRecords.get(0);
    }

    public List<UserConfigRecord> getMapsConfigByUserKey(String userKey) {
        List userConfigRecords = this.userConfigRecordMapper.findUserConfigRecordByUserKey(userKey);
        return userConfigRecords;
    }
}

