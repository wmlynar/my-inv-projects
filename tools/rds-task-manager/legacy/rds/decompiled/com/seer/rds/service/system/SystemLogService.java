/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SystemLogMapper
 *  com.seer.rds.model.admin.SysLog
 *  com.seer.rds.service.system.SystemLogService
 *  com.seer.rds.service.system.SystemLogService$1
 *  com.seer.rds.vo.req.SystemLogReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.SystemLogResp
 *  javax.transaction.Transactional
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.system;

import com.seer.rds.dao.SystemLogMapper;
import com.seer.rds.model.admin.SysLog;
import com.seer.rds.service.system.SystemLogService;
import com.seer.rds.vo.req.SystemLogReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.SystemLogResp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import javax.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class SystemLogService {
    @Autowired
    private SystemLogMapper systemLogMapper;

    @Transactional
    public PaginationResponseVo findSystemLog(int page, int size, SystemLogReq systemLogReq) {
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        String level = systemLogReq.getLevel();
        String operator = systemLogReq.getOprUser();
        String startDate = systemLogReq.getStartDate();
        String endDate = systemLogReq.getEndDate();
        SimpleDateFormat ft = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        1 spec = new /* Unavailable Anonymous Inner Class!! */;
        Page sites = this.systemLogMapper.findAll((Specification)spec, (Pageable)pageable);
        ArrayList<SystemLogResp> systemLogRespList = new ArrayList<SystemLogResp>();
        for (int i = 0; i < sites.getContent().size(); ++i) {
            SystemLogResp systemLogResp = new SystemLogResp();
            systemLogResp.setId(((SysLog)sites.getContent().get(i)).getId());
            systemLogResp.setLevel(((SysLog)sites.getContent().get(i)).getLevel());
            systemLogResp.setOprUser(((SysLog)sites.getContent().get(i)).getOprUser());
            systemLogResp.setOperation(String.valueOf(((SysLog)sites.getContent().get(i)).getOperation()));
            systemLogResp.setCreateDate(((SysLog)sites.getContent().get(i)).getCreateDate());
            systemLogResp.setMessage(((SysLog)sites.getContent().get(i)).getMessage());
            systemLogRespList.add(systemLogResp);
        }
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(sites.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(sites.getTotalPages()));
        paginationResponseVo.setPageList(systemLogRespList);
        return paginationResponseVo;
    }
}

