/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.service.agv.WindTemplateTaskService
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.TemplateTaskMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WindTemplateTaskService {
    private static final Logger log = LoggerFactory.getLogger(WindTemplateTaskService.class);
    @Autowired
    private TemplateTaskMapper templateTaskMapper;

    @Transactional
    public void setTemplateEnable(String id) {
        this.templateTaskMapper.setAllDisable();
        this.templateTaskMapper.stateChange(id);
    }
}

