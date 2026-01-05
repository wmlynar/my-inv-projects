/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SysLogMapper
 *  com.seer.rds.model.admin.SysLog
 *  com.seer.rds.service.admin.SysLogService
 *  javax.transaction.Transactional
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin;

import com.seer.rds.dao.SysLogMapper;
import com.seer.rds.model.admin.SysLog;
import javax.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SysLogService {
    @Autowired
    private SysLogMapper sysLogMapper;

    @Transactional
    public void saveSysLog(SysLog log) {
        this.sysLogMapper.save((Object)log);
    }
}

