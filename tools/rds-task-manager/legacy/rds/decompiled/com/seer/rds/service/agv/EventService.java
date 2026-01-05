/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.EventDefMapper
 *  com.seer.rds.dao.EventRecordMapper
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.EventRecord
 *  com.seer.rds.service.agv.EventService
 *  com.seer.rds.vo.req.EventRecordReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Order
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.EventDefMapper;
import com.seer.rds.dao.EventRecordMapper;
import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.EventRecord;
import com.seer.rds.vo.req.EventRecordReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.io.Serializable;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Order;
import javax.persistence.criteria.Predicate;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class EventService {
    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    @Autowired
    private EventDefMapper eventDefMapper;
    @Autowired
    private EventRecordMapper eventRecordMapper;

    public List<EventDef> findAll() {
        Sort sortByCreateTimeDesc = Sort.by((Sort.Direction)Sort.Direction.DESC, (String[])new String[]{"createDate"});
        return this.eventDefMapper.findAll(sortByCreateTimeDesc);
    }

    public EventDef findDefById(String id) {
        Optional eventDefMapperById = this.eventDefMapper.findById((Object)id);
        boolean present = eventDefMapperById.isPresent();
        if (present) {
            return (EventDef)eventDefMapperById.get();
        }
        log.info("eventDefMapperById is null. id : " + id);
        return null;
    }

    public void deleteEventDef(String id) {
        this.eventDefMapper.deleteById((Object)id);
    }

    public void saveOrUpdateEventDef(EventDef eventDef) {
        this.eventDefMapper.save((Object)eventDef);
    }

    public Object findEventRecordByCondition(EventRecordReq condition, Integer page, Integer pageSize) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<Predicate>();
            if (condition.getId() != null) {
                predicates.add(cb.equal((Expression)root.get("id"), (Object)condition.getId()));
            }
            if (condition.getDefLabel() != null) {
                predicates.add(cb.equal((Expression)root.get("defLabel"), (Object)condition.getDefLabel()));
            }
            if (condition.getStatus() != null) {
                predicates.add(cb.equal((Expression)root.get("status"), (Object)condition.getStatus()));
            }
            if (StringUtils.isNotEmpty((CharSequence)condition.getCreatedOn()) && StringUtils.isNotEmpty((CharSequence)condition.getEndedOn())) {
                try {
                    predicates.add(cb.between((Expression)root.get("createdOn"), (Comparable)DateUtils.parseDate((String)condition.getCreatedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"}), (Comparable)DateUtils.parseDate((String)condition.getEndedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    log.error("" + e);
                }
            }
            if (StringUtils.isNotEmpty((CharSequence)condition.getCreatedOn()) && StringUtils.isEmpty((CharSequence)condition.getEndedOn())) {
                try {
                    predicates.add(cb.greaterThanOrEqualTo((Expression)root.get("createdOn"), (Comparable)DateUtils.parseDate((String)condition.getCreatedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    log.error("" + e);
                }
            }
            if (StringUtils.isEmpty((CharSequence)condition.getCreatedOn()) && StringUtils.isNotEmpty((CharSequence)condition.getEndedOn())) {
                try {
                    predicates.add(cb.lessThan((Expression)root.get("endedOn"), (Comparable)DateUtils.parseDate((String)condition.getEndedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    log.error("" + e);
                }
            }
            query.orderBy(new Order[]{cb.desc((Expression)root.get("createdOn"))});
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        if (pageSize != null && page != 0) {
            PageRequest pageRequest = page != null ? PageRequest.of((int)(page - 1), (int)pageSize) : PageRequest.ofSize((int)pageSize);
            Page taskAll = this.eventRecordMapper.findAll((Specification)spec, (Pageable)pageRequest);
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(taskAll.getTotalElements()));
            paginationResponseVo.setCurrentPage(page);
            paginationResponseVo.setPageSize(pageSize);
            paginationResponseVo.setTotalPage(Integer.valueOf(taskAll.getTotalPages()));
            paginationResponseVo.setPageList(taskAll.getContent());
            return paginationResponseVo;
        }
        List taskAll = this.eventRecordMapper.findAll((Specification)spec);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(taskAll.size()));
        paginationResponseVo.setCurrentPage(page);
        paginationResponseVo.setPageSize(pageSize);
        paginationResponseVo.setTotalPage(null);
        paginationResponseVo.setPageList(taskAll);
        return paginationResponseVo;
    }

    public void setEnable(Boolean ifEnable, String recordId) {
        this.eventDefMapper.setEnable(ifEnable, recordId);
    }

    public EventRecord findRecordById(String id) {
        Optional eventRecordMapperById = this.eventRecordMapper.findById((Object)id);
        boolean present = eventRecordMapperById.isPresent();
        if (present) {
            return (EventRecord)eventRecordMapperById.get();
        }
        log.info("eventRecordMapperById is null. id : " + id);
        return null;
    }
}

