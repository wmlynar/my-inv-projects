/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ModbusInstanceMapper
 *  com.seer.rds.dao.ModbusReadLogMapper
 *  com.seer.rds.dao.ModbusWriteLogMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.model.modbus.ModbusReadLog
 *  com.seer.rds.model.modbus.ModbusWriteLog
 *  com.seer.rds.service.modbus.ModbusService
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Order
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.modbus;

import com.seer.rds.dao.ModbusInstanceMapper;
import com.seer.rds.dao.ModbusReadLogMapper;
import com.seer.rds.dao.ModbusWriteLogMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.modbus.ModbusInstance;
import com.seer.rds.model.modbus.ModbusReadLog;
import com.seer.rds.model.modbus.ModbusWriteLog;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Order;
import javax.persistence.criteria.Predicate;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModbusService {
    @Autowired
    private ModbusReadLogMapper modbusReadLogMapper;
    @Autowired
    private ModbusWriteLogMapper modbusWriteLogMapper;
    @Autowired
    private ModbusInstanceMapper modbusInstanceMapper;

    public void saveReadLog(ModbusReadLog modbusReadLog) {
        this.modbusReadLogMapper.save((Object)modbusReadLog);
    }

    public void saveWriteLog(ModbusWriteLog modbusWriteLog) {
        this.modbusWriteLogMapper.save((Object)modbusWriteLog);
    }

    public Page<ModbusReadLog> findAllReadLog(int currentPage, int pageSize) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize, (Sort)Sort.by((Sort.Direction)Sort.Direction.fromString((String)"DESC"), (String[])new String[]{"id"}));
        return this.modbusReadLogMapper.findAll((Pageable)pageable);
    }

    public Page<ModbusWriteLog> findAllWriteLog(int currentPage, int pageSize) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize, (Sort)Sort.by((Sort.Direction)Sort.Direction.fromString((String)"DESC"), (String[])new String[]{"id"}));
        return this.modbusWriteLogMapper.findAll((Pageable)pageable);
    }

    @Transactional
    public void saveInstance(ModbusInstance instance) {
        this.modbusInstanceMapper.save((Object)instance);
    }

    @Transactional
    public int deleteInstanceByIds(List<String> ids) {
        int updates = this.modbusInstanceMapper.deleteAllByIdIn(ids);
        Modbus4jUtils.removeInstanceById(ids);
        return updates;
    }

    public List<ModbusInstance> findInstanceByCondition(ModbusInstance instanceReq) {
        Specification spec = this.buildModbusInstanceSpec(instanceReq);
        return this.modbusInstanceMapper.findAll(spec);
    }

    public PaginationResponseVo<ModbusInstance> findInstancePaginationByCondition(int currentPage, int pageSize, ModbusInstance instanceParamReq) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize);
        Specification spec = this.buildModbusInstanceSpec(instanceParamReq);
        Page modbusInstancePage = this.modbusInstanceMapper.findAll(spec, (Pageable)pageable);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalPage(Integer.valueOf(modbusInstancePage.getTotalPages()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currentPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalCount(Long.valueOf(modbusInstancePage.getTotalElements()));
        paginationResponseVo.setPageList(modbusInstancePage.toList());
        return paginationResponseVo;
    }

    private Specification<ModbusInstance> buildModbusInstanceSpec(ModbusInstance instanceReq) {
        if (instanceReq == null) {
            return (Specification & Serializable)(root, query, criteriaBuilder) -> null;
        }
        String id = instanceReq.getId();
        String name = instanceReq.getName();
        String protocol = instanceReq.getProtocol();
        String host = instanceReq.getHost();
        Integer port = instanceReq.getPort();
        Integer slaveId = instanceReq.getSlaveId();
        String type = instanceReq.getType();
        Integer targetAddr = instanceReq.getTargetAddr();
        List desc = instanceReq.getDesc();
        List asc = instanceReq.getAsc();
        return (Specification & Serializable)(root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<Predicate>();
            if (StringUtils.isNotEmpty((CharSequence)id)) {
                predicates.add(cb.equal((Expression)root.get("id"), (Object)id));
            }
            if (StringUtils.isNotEmpty((CharSequence)name)) {
                predicates.add(cb.like((Expression)root.get("name"), "%" + name + "%"));
            }
            if (StringUtils.isNotEmpty((CharSequence)protocol)) {
                predicates.add(cb.like((Expression)root.get("protocol"), "%" + protocol + "%"));
            }
            if (StringUtils.isNotEmpty((CharSequence)host)) {
                predicates.add(cb.like((Expression)root.get("host"), "%" + host + "%"));
            }
            if (StringUtils.isNotEmpty((CharSequence)type)) {
                predicates.add(cb.like((Expression)root.get("type"), "%" + type + "%"));
            }
            if (port != null) {
                predicates.add(cb.equal((Expression)root.get("port"), (Object)port));
            }
            if (slaveId != null) {
                predicates.add(cb.equal((Expression)root.get("slaveId"), (Object)slaveId));
            }
            if (targetAddr != null) {
                predicates.add(cb.equal((Expression)root.get("targetAddr"), (Object)targetAddr));
            }
            LinkedList<Order> orders = new LinkedList<Order>();
            orders.add(cb.desc(root.get("updateTime").as(String.class)));
            if (desc != null && !desc.isEmpty()) {
                orders.addAll(desc.stream().map(d -> cb.desc(root.get(d).as(String.class))).collect(Collectors.toList()));
            }
            if (asc != null && !asc.isEmpty()) {
                orders.addAll(asc.stream().map(a -> cb.asc(root.get(a).as(String.class))).collect(Collectors.toList()));
            }
            query.orderBy(orders);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

