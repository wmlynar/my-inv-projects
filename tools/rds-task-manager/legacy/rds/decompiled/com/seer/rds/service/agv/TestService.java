/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.TestRecordMapper
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.service.agv.TestService
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.TestRecordMapper;
import com.seer.rds.model.wind.TestRecord;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class TestService {
    private static final Logger log = LoggerFactory.getLogger(TestService.class);
    @Autowired
    private TestRecordMapper testRecordMapper;

    public TestRecord findRecordById(String id) {
        Optional testRecordMapperById = this.testRecordMapper.findById((Object)id);
        boolean present = testRecordMapperById.isPresent();
        if (present) {
            return (TestRecord)testRecordMapperById.get();
        }
        log.info("testRecordMapperById is null. id : " + id);
        return null;
    }

    public List<TestRecord> findTestRecord(String taskLabel) {
        PageRequest pageable = PageRequest.of((int)0, (int)5);
        return this.testRecordMapper.findByDefLabel(taskLabel, (Pageable)pageable);
    }
}

