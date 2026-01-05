/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.dao.InterfaceHandleRecordMapper
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.service.agv.InterfaceService
 *  com.seer.rds.service.wind.InterfaceRootBp
 *  com.seer.rds.vo.req.InterfacePreHandleReq
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Order
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.dao.DataIntegrityViolationException
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 *  unitauto.JSON
 */
package com.seer.rds.service.agv;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.dao.InterfaceHandleMapper;
import com.seer.rds.dao.InterfaceHandleRecordMapper;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.service.wind.InterfaceRootBp;
import com.seer.rds.vo.req.InterfacePreHandleReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.io.Serializable;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Order;
import javax.persistence.criteria.Predicate;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import unitauto.JSON;

@Service
public class InterfaceService {
    private static final Logger log = LoggerFactory.getLogger(InterfaceService.class);
    private final InterfaceHandleMapper interfaceHandleMapper;
    private final InterfaceRootBp interfaceRootBp;
    private final InterfaceHandleRecordMapper interfaceHandleRecordMapper;

    public InterfaceService(InterfaceHandleMapper interfaceHandleMapper, InterfaceRootBp interfaceRootBp, InterfaceHandleRecordMapper interfaceHandleRecordMapper) {
        this.interfaceHandleMapper = interfaceHandleMapper;
        this.interfaceRootBp = interfaceRootBp;
        this.interfaceHandleRecordMapper = interfaceHandleRecordMapper;
    }

    public void saveInterface(InterfacePreHandle interfacePreHandle) throws DataIntegrityViolationException {
        this.interfaceHandleMapper.save((Object)interfacePreHandle);
    }

    public Object dispatcherWildCard(String method, String path, String args, Map<String, String[]> queryParams) {
        InterfacePreHandle interfacePreHandle = this.interfaceHandleMapper.findByUrlAndMethod(path, method).stream().findFirst().orElse(null);
        if (interfacePreHandle == null) {
            HashMap resp = Maps.newHashMap();
            resp.put("code", 500);
            resp.put("body", "interface is not exist");
            return resp;
        }
        SetOrderReq setOrderReqInterface = new SetOrderReq();
        setOrderReqInterface.setTaskLabel(interfacePreHandle.getTaskDefLabel());
        setOrderReqInterface.setTaskId(interfacePreHandle.getId());
        setOrderReqInterface.setInterfacePreHandle(interfacePreHandle);
        setOrderReqInterface.setUrl(interfacePreHandle.getUrl());
        setOrderReqInterface.setMethod(interfacePreHandle.getMethod());
        if (interfacePreHandle.getMethod().equals("POST")) {
            if (interfacePreHandle.getPda() == 1) {
                JSONObject paramObject = JSONObject.parseObject((String)args);
                if (paramObject != null) {
                    String params = paramObject.getString("params");
                    JSONArray paramsArray = JSONArray.parseArray((String)params);
                    HashMap<String, String> objectObjectHashMap = new HashMap<String, String>();
                    if (paramsArray != null && paramsArray.size() > 0) {
                        for (int i = 0; i < paramsArray.size(); ++i) {
                            JSONObject job = paramsArray.getJSONObject(i);
                            String value = (String)job.get((Object)"value") == null ? "" : (String)job.get((Object)"value");
                            String s = value.replace("[", "[\"").replace("]", "\"]").replaceAll(",", "\",\"");
                            objectObjectHashMap.put((String)job.get((Object)"key"), s);
                        }
                    }
                    HashMap<String, String> pdaInfo = new HashMap<String, String>();
                    for (String key : paramObject.keySet()) {
                        if (Objects.equals(key, "params")) continue;
                        pdaInfo.put(key, paramObject.getString(key));
                    }
                    objectObjectHashMap.put("pdaInfo", JSONObject.toJSONString(pdaInfo));
                    String paramFormat = JSON.format(objectObjectHashMap);
                    setOrderReqInterface.setInputParams(paramFormat);
                }
            } else {
                HashMap objectObjectHashMap = new HashMap();
                JSONObject jsonObject = JSONObject.parseObject((String)args);
                if (jsonObject != null) {
                    for (Map.Entry next : jsonObject.entrySet()) {
                        String reqName = (String)next.getKey();
                        Object value = next.getValue();
                        objectObjectHashMap.put(reqName, value);
                    }
                    setOrderReqInterface.setInputParams(JSONObject.toJSONString(objectObjectHashMap));
                }
            }
        } else if (interfacePreHandle.getMethod().equals("GET")) {
            HashMap<String, String> objectObjectHashMap = new HashMap<String, String>();
            for (Map.Entry<String, String[]> next : queryParams.entrySet()) {
                String reqName = next.getKey();
                String[] value = next.getValue();
                objectObjectHashMap.put(reqName, Arrays.stream(value).findFirst().get());
            }
            setOrderReqInterface.setInputParams(JSONObject.toJSONString(objectObjectHashMap));
        }
        return this.interfaceRootBp.execute(setOrderReqInterface);
    }

    public PaginationResponseVo findInterfaceByCondition(InterfacePreHandleReq condition, Integer page, Integer pageSize) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<Predicate>();
            if (condition.getUrl() != null) {
                predicates.add(cb.equal((Expression)root.get("url"), (Object)condition.getUrl()));
            }
            if (condition.getMethod() != null) {
                predicates.add(cb.equal((Expression)root.get("method"), (Object)condition.getMethod()));
            }
            if (condition.getStatus() != null) {
                predicates.add(cb.equal((Expression)root.get("status"), (Object)condition.getStatus()));
            }
            if (StringUtils.isNotEmpty((CharSequence)condition.getCreatedOn()) && StringUtils.isNotEmpty((CharSequence)condition.getEndedOn())) {
                try {
                    predicates.add(cb.between((Expression)root.get("createdOn"), (Comparable)DateUtils.parseDate((String)condition.getCreatedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"}), (Comparable)DateUtils.parseDate((String)condition.getEndedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    log.error("findInterfaceByCondition ParseException", (Throwable)e);
                }
            }
            if (StringUtils.isNotEmpty((CharSequence)condition.getCreatedOn()) && StringUtils.isEmpty((CharSequence)condition.getEndedOn())) {
                try {
                    predicates.add(cb.greaterThanOrEqualTo((Expression)root.get("createdOn"), (Comparable)DateUtils.parseDate((String)condition.getCreatedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    log.error("findInterfaceByCondition ParseException", (Throwable)e);
                }
            }
            if (StringUtils.isEmpty((CharSequence)condition.getCreatedOn()) && StringUtils.isNotEmpty((CharSequence)condition.getEndedOn())) {
                try {
                    predicates.add(cb.lessThan((Expression)root.get("endedOn"), (Comparable)DateUtils.parseDate((String)condition.getEndedOn(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    log.error("InterfaceService findInterfaceByCondition exception", (Throwable)e);
                }
            }
            if (condition.getTaskDefLabel() != null) {
                predicates.add(cb.equal((Expression)root.get("defLabel"), (Object)condition.getTaskDefLabel()));
            }
            query.orderBy(new Order[]{cb.desc((Expression)root.get("createdOn"))});
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        if (pageSize != null && page != 0) {
            PageRequest pageRequest = page != null ? PageRequest.of((int)(page - 1), (int)pageSize) : PageRequest.ofSize((int)pageSize);
            Page taskAll = this.interfaceHandleRecordMapper.findAll((Specification)spec, (Pageable)pageRequest);
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(taskAll.getTotalElements()));
            paginationResponseVo.setCurrentPage(page);
            paginationResponseVo.setPageSize(pageSize);
            paginationResponseVo.setTotalPage(Integer.valueOf(taskAll.getTotalPages()));
            paginationResponseVo.setPageList(taskAll.getContent());
            return paginationResponseVo;
        }
        List taskAll = this.interfaceHandleRecordMapper.findAll((Specification)spec);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(taskAll.size()));
        paginationResponseVo.setCurrentPage(page);
        paginationResponseVo.setPageSize(pageSize);
        paginationResponseVo.setTotalPage(null);
        paginationResponseVo.setPageList(taskAll);
        return paginationResponseVo;
    }

    public void deleteInterface(String id) {
        this.interfaceHandleMapper.deleteById((Object)id);
    }

    public List<InterfacePreHandle> findAll() {
        return this.interfaceHandleMapper.findAllAndIsNotHistory();
    }

    public InterfacePreHandle findDefById(String id) {
        Optional interfaceHandleMapperById = this.interfaceHandleMapper.findById((Object)id);
        boolean present = interfaceHandleMapperById.isPresent();
        if (present) {
            return (InterfacePreHandle)interfaceHandleMapperById.get();
        }
        log.info("InterfacePreHandle is null. id : " + id);
        return null;
    }

    public InterfaceHandleRecord findInstanceById(String id) {
        Optional byId = this.interfaceHandleRecordMapper.findById((Object)id);
        boolean present = byId.isPresent();
        if (present) {
            return (InterfaceHandleRecord)byId.get();
        }
        log.info("InterfacePreHandle is null. id : " + id);
        return null;
    }

    public List<InterfacePreHandle> findOneTaskDefByIdList(List<String> idLists) {
        return this.interfaceHandleMapper.findTaskDefList(idLists);
    }
}

