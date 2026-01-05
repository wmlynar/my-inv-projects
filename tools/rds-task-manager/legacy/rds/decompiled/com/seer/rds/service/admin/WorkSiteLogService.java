/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WorkSiteLogMapper
 *  com.seer.rds.model.worksite.WorkSiteLog
 *  com.seer.rds.service.admin.WorkSiteLogService
 *  com.seer.rds.service.admin.WorkSiteLogService$1
 *  com.seer.rds.vo.req.WorkSiteLogReq
 *  com.seer.rds.vo.req.WorkSiteLogResp
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.transaction.Transactional
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin;

import com.seer.rds.dao.WorkSiteLogMapper;
import com.seer.rds.model.worksite.WorkSiteLog;
import com.seer.rds.service.admin.WorkSiteLogService;
import com.seer.rds.vo.req.WorkSiteLogReq;
import com.seer.rds.vo.req.WorkSiteLogResp;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class WorkSiteLogService {
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private WorkSiteLogMapper workSiteLogMapper;

    @Transactional
    public void saveWorkSiteLog(WorkSiteLog log) {
        this.workSiteLogMapper.save((Object)log);
    }

    @Transactional
    public void addBatch(List<WorkSiteLog> list) {
        for (WorkSiteLog workSiteLog : list) {
            this.entityManager.persist((Object)workSiteLog);
        }
        this.entityManager.flush();
        this.entityManager.clear();
    }

    @Transactional
    public PaginationResponseVo findSiteLog(int page, int size, WorkSiteLogReq workSiteLogReq) {
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        String siteId = workSiteLogReq.getWorkSiteId();
        Integer oprType = workSiteLogReq.getOprType();
        String oprUser = workSiteLogReq.getOprUser();
        Date startDate = workSiteLogReq.getStartDate();
        Date endDate = workSiteLogReq.getEndDate();
        SimpleDateFormat ft = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        1 spec = new /* Unavailable Anonymous Inner Class!! */;
        Page sites = this.workSiteLogMapper.findAll((Specification)spec, (Pageable)pageable);
        ArrayList<WorkSiteLogResp> workSiteLogRespList = new ArrayList<WorkSiteLogResp>();
        for (int i = 0; i < sites.getContent().size(); ++i) {
            WorkSiteLogResp workSiteLogResp = new WorkSiteLogResp();
            workSiteLogResp.setId(((WorkSiteLog)sites.getContent().get(i)).getId());
            workSiteLogResp.setWorkSiteId(((WorkSiteLog)sites.getContent().get(i)).getWorkSiteId());
            workSiteLogResp.setOprUser(((WorkSiteLog)sites.getContent().get(i)).getOprUser());
            workSiteLogResp.setOprType(String.valueOf(((WorkSiteLog)sites.getContent().get(i)).getOprType()));
            workSiteLogResp.setCreateDate(ft.format(((WorkSiteLog)sites.getContent().get(i)).getCreateDate()));
            workSiteLogRespList.add(workSiteLogResp);
        }
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(sites.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(sites.getTotalPages()));
        paginationResponseVo.setPageList(workSiteLogRespList);
        return paginationResponseVo;
    }
}

