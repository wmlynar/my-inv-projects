/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Lists
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.PagerAddressRecordMapper
 *  com.seer.rds.dao.PagerMapper
 *  com.seer.rds.dao.PagerTaskRecordMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.device.Pager
 *  com.seer.rds.model.device.PagerAddressRecord
 *  com.seer.rds.model.device.PagerTaskRecord
 *  com.seer.rds.runnable.SerialScheduledExecutorService
 *  com.seer.rds.service.admin.UserMessageService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.device.PagerService
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.PagerAddressRecordVo
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.annotation.PostConstruct
 *  javax.persistence.EntityManager
 *  javax.persistence.Query
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Sort
 *  org.springframework.data.domain.Sort$Direction
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.device;

import com.google.common.collect.Lists;
import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.PagerAddressRecordMapper;
import com.seer.rds.dao.PagerMapper;
import com.seer.rds.dao.PagerTaskRecordMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.device.Pager;
import com.seer.rds.model.device.PagerAddressRecord;
import com.seer.rds.model.device.PagerTaskRecord;
import com.seer.rds.runnable.SerialScheduledExecutorService;
import com.seer.rds.service.admin.UserMessageService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.PagerAddressRecordVo;
import com.seer.rds.vo.StopAllTaskReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.web.config.ConfigFileController;
import java.io.Serializable;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Predicate;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PagerService {
    private static final Logger log = LoggerFactory.getLogger(PagerService.class);
    @Autowired
    private EntityManager em;
    @Autowired
    private PagerMapper pagerMapper;
    @Autowired
    private PagerAddressRecordMapper pagerAddressRecordMapper;
    @Autowired
    private PagerTaskRecordMapper pagerTaskRecordMapper;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private ConfigFileController configFileController;
    public static final Object pagerDetailMapLock = new Object();
    public static ConcurrentHashMap<String, PagerAddressRecordVo> pagerDetailMap = new ConcurrentHashMap();
    public static ConcurrentHashMap<Long, List<Integer>> pagerValueMap = new ConcurrentHashMap();
    private SerialScheduledExecutorService executorService = null;

    public List<Pager> findPagerByCondition(String deviceName, String brand, String ip, Boolean disabled) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<Predicate>();
            if (StringUtils.isNotEmpty((CharSequence)deviceName)) {
                predicates.add(cb.equal((Expression)root.get("deviceName"), (Object)deviceName));
            }
            if (StringUtils.isNotEmpty((CharSequence)brand)) {
                predicates.add(cb.equal((Expression)root.get("brand"), (Object)brand));
            }
            if (StringUtils.isNotEmpty((CharSequence)ip)) {
                predicates.add(cb.equal((Expression)root.get("ip"), (Object)ip));
            }
            if (disabled != null) {
                if (disabled.booleanValue()) {
                    predicates.add(cb.isTrue((Expression)root.get("disabled")));
                } else {
                    Predicate isFalse = cb.isFalse((Expression)root.get("disabled"));
                    Predicate isNull = cb.isNull((Expression)root.get("disabled"));
                    predicates.add(cb.or((Expression)isFalse, (Expression)isNull));
                }
            }
            return cb.and(predicates.toArray(new Predicate[predicates.size()]));
        };
        return this.pagerMapper.findAll((Specification)spec, Sort.by((Sort.Direction)Sort.Direction.fromString((String)"ASC"), (String[])new String[]{"brand", "ip", "port"}));
    }

    public List<Long> findUnDisabledIdFromPager() {
        return this.pagerMapper.findUnDisabledIdFromPager();
    }

    public List<Integer> find1FromPagerAddress() {
        return this.pagerAddressRecordMapper.find1FromPagerAddress();
    }

    public List<Long> findIdByIp(String ip) {
        return this.pagerMapper.findIdByIp(ip);
    }

    public List<String> findAllOrderTask() {
        return this.pagerAddressRecordMapper.findAllOrderTask();
    }

    public List<PagerAddressRecordVo> findPagerAddressRecordVoByDeviceNameAndIp(String deviceName, String ip) {
        StringBuilder jpql = new StringBuilder("SELECT r.id, p.id, p.brand, p.deviceName, p.protocolType, p.ip, p.port, p.slaveId, p.functionCode, r.address, r.value, r.remark, r.lightAddress, r.lightValue, r.lightRemark, r.orderTask, r.cancelTask FROM Pager p LEFT JOIN PagerAddressRecord r ON p.id = r.pagerId ");
        if (StringUtils.isNotEmpty((CharSequence)deviceName) || StringUtils.isNotEmpty((CharSequence)ip)) {
            jpql.append("WHERE ");
            if (StringUtils.isNotEmpty((CharSequence)deviceName)) {
                jpql.append("p.deviceName = :deviceName ");
            }
            if (StringUtils.isNotEmpty((CharSequence)ip)) {
                jpql.append("p.ip = :ip ");
            }
        }
        jpql.append("ORDER BY p.ip, r.address asc");
        Query query = this.em.createQuery(jpql.toString());
        if (StringUtils.isNotEmpty((CharSequence)deviceName)) {
            query.setParameter("deviceName", (Object)deviceName);
        }
        if (StringUtils.isNotEmpty((CharSequence)ip)) {
            query.setParameter("ip", (Object)ip);
        }
        List rows = query.getResultList();
        return this.transRowToList(rows);
    }

    @Transactional
    public void importPagerData(List<PagerAddressRecordVo> pagerAddressRecordVos) {
        ArrayList<PagerAddressRecordVo> collect = new ArrayList<PagerAddressRecordVo>();
        for (PagerAddressRecordVo vo : pagerAddressRecordVos) {
            List idByIp = this.pagerMapper.findIdByIp(vo.getIp());
            if (!CollectionUtils.isEmpty((Collection)idByIp)) continue;
            collect.add(vo);
        }
        if (CollectionUtils.isEmpty(collect)) {
            log.info("\u5bfc\u5165\u547c\u53eb\u5668\u6570\u636e\uff1a\u6ca1\u6709\u65b0\u7684\u6570\u636e\u53ef\u4ee5\u5bfc\u5165\u3002");
            return;
        }
        List pagerList = this.getPagerFromPagerAddressRecordVos(collect);
        List addressRecordList = this.getAddressFromPagerAddressRecordVos(collect);
        this.jdbcSaveAllPagers(pagerList);
        if (CollectionUtils.isNotEmpty((Collection)addressRecordList)) {
            this.jdbcSaveAllPagersAddress(addressRecordList);
            for (Pager pager : pagerList) {
                for (PagerAddressRecord record : addressRecordList) {
                    if (!Objects.equals(pager.getId(), record.getPagerId())) continue;
                    this.cachePagerDetailData(pager, record);
                }
            }
        }
    }

    private void cachePagerDetailData(Pager pager, PagerAddressRecord record) {
        PagerAddressRecordVo build = PagerAddressRecordVo.builder().id(record.getId()).pagerId(record.getPagerId()).brandName(pager.getBrand()).deviceName(pager.getDeviceName()).protocolType(pager.getProtocolType()).ip(pager.getIp()).port(pager.getPort()).slaveId(pager.getSlaveId()).functionCode(pager.getFunctionCode()).address(record.getAddress()).value(record.getValue()).remark(record.getRemark()).lightAddress(record.getLightAddress()).lightValue(record.getLightValue()).lightRemark(record.getLightRemark()).orderTask(record.getOrderTask()).cancelTask(record.getCancelTask()).build();
        pagerDetailMap.put(record.getPagerId() + ":" + record.getAddress(), build);
    }

    private void jdbcSaveAllPagersAddress(List<PagerAddressRecord> addressRecordList) {
        PagerAddressRecord addressRecord = addressRecordList.get(0);
        StringBuilder insertSql = new StringBuilder("INSERT INTO `t_pageraddressrecord` (`id`, `address`, `cancel_task`, `create_time`, `light_address`, `light_remark`, `order_task`, `pager_id`, `remark`) VALUES ");
        insertSql.append("(").append(addressRecord.getId()).append(",");
        if (StringUtils.isEmpty((CharSequence)addressRecord.getCancelTask())) {
            insertSql.append(addressRecord.getAddress()).append(",").append(addressRecord.getCancelTask()).append(", '");
        } else {
            insertSql.append(addressRecord.getAddress()).append(", '").append(addressRecord.getCancelTask()).append("'").append(", '");
        }
        insertSql.append(new Timestamp(addressRecord.getCreateTime().getTime())).append("'").append(",");
        if (StringUtils.isEmpty((CharSequence)addressRecord.getLightRemark())) {
            insertSql.append(addressRecord.getLightAddress()).append(",").append(addressRecord.getLightRemark()).append(", '");
        } else {
            insertSql.append(addressRecord.getLightAddress()).append(", '").append(addressRecord.getLightRemark()).append("'").append(", '");
        }
        insertSql.append(addressRecord.getOrderTask()).append("'").append(",").append(addressRecord.getPagerId()).append(", '").append(addressRecord.getRemark()).append("'").append(")");
        for (int i = 1; i < addressRecordList.size(); ++i) {
            insertSql.append(", ").append("(").append(addressRecordList.get(i).getId()).append(",");
            if (StringUtils.isEmpty((CharSequence)addressRecordList.get(i).getCancelTask())) {
                insertSql.append(addressRecordList.get(i).getAddress()).append(",").append(addressRecordList.get(i).getCancelTask()).append(", '");
            } else {
                insertSql.append(addressRecordList.get(i).getAddress()).append(", '").append(addressRecordList.get(i).getCancelTask()).append("'").append(", '");
            }
            insertSql.append(new Timestamp(addressRecordList.get(i).getCreateTime().getTime())).append("'").append(",");
            if (StringUtils.isEmpty((CharSequence)addressRecordList.get(i).getLightRemark())) {
                insertSql.append(addressRecordList.get(i).getLightAddress()).append(",").append(addressRecordList.get(i).getLightRemark()).append(", '");
            } else {
                insertSql.append(addressRecordList.get(i).getLightAddress()).append(", '").append(addressRecordList.get(i).getLightRemark()).append("'").append(", '");
            }
            insertSql.append(addressRecordList.get(i).getOrderTask()).append("'").append(",").append(addressRecordList.get(i).getPagerId()).append(", '").append(addressRecordList.get(i).getRemark()).append("'").append(")");
        }
        insertSql.append(";");
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        jdbcTemplate.execute(insertSql.toString());
    }

    private void jdbcSaveAllPagers(List<Pager> pagerList) {
        Pager pager = pagerList.get(0);
        StringBuilder insertSql = new StringBuilder("INSERT INTO `t_pager` (`id`, `brand`, `create_time`, `device_name`, `function_code`, `ip`, `port`, `protocol_type`, `slave_id`, `disabled`) VALUES ");
        insertSql.append("(").append(pager.getId()).append(", '").append(pager.getBrand()).append("'").append(", '").append(new Timestamp(pager.getCreateTime().getTime())).append("'").append(", '").append(pager.getDeviceName()).append("'").append(", '").append(pager.getFunctionCode()).append("'").append(", '").append(pager.getIp()).append("'").append(",").append(pager.getPort()).append(", '").append(pager.getProtocolType()).append("'").append(",").append(pager.getSlaveId()).append(",").append(pager.getDisabled()).append(")");
        for (int i = 1; i < pagerList.size(); ++i) {
            insertSql.append(", ").append("(").append(pagerList.get(i).getId()).append(", '").append(pagerList.get(i).getBrand()).append("'").append(", '").append(new Timestamp(pagerList.get(i).getCreateTime().getTime())).append("'").append(", '").append(pagerList.get(i).getDeviceName()).append("'").append(", '").append(pagerList.get(i).getFunctionCode()).append("'").append(", '").append(pagerList.get(i).getIp()).append("'").append(",").append(pagerList.get(i).getPort()).append(", '").append(pagerList.get(i).getProtocolType()).append("'").append(",").append(pagerList.get(i).getSlaveId()).append(",").append(pagerList.get(i).getDisabled()).append(")");
        }
        insertSql.append(";");
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        jdbcTemplate.execute(insertSql.toString());
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Transactional
    public void saveOrUpdatePagerAndAddressAndCacheAndDelAddress(Pager pager, List<PagerAddressRecord> records, List<Long> delIds) {
        Pager savedPager = (Pager)this.pagerMapper.save((Object)pager);
        Object object = pagerDetailMapLock;
        synchronized (object) {
            if (CollectionUtils.isNotEmpty(delIds)) {
                List addressList = this.pagerAddressRecordMapper.findAddressByIdIn(delIds);
                for (Object address : addressList) {
                    pagerDetailMap.remove(pager.getId() + ":" + (Integer)address);
                }
                this.pagerAddressRecordMapper.deleteAllById(delIds);
            }
            if (CollectionUtils.isEmpty(records)) {
                return;
            }
            records.forEach(r -> r.setPagerId(savedPager.getId()));
            List ids = records.stream().map(PagerAddressRecord::getId).filter(Objects::nonNull).collect(Collectors.toList());
            List addressList = this.pagerAddressRecordMapper.findAddressByIdIn(ids);
            for (Integer address : addressList) {
                pagerDetailMap.remove(pager.getId() + ":" + address);
            }
            List saveList = this.pagerAddressRecordMapper.saveAll(records);
            for (PagerAddressRecord record : saveList) {
                this.cachePagerDetailData(pager, record);
            }
            this.restartPagerThread();
        }
    }

    private void restartPagerThread() {
        if (this.executorService != null) {
            this.executorService.shutDown();
        }
        this.init();
    }

    public void disablePager(List<Long> ids) {
        this.pagerMapper.updateDisabledByIds(Boolean.valueOf(true), ids);
        this.restartPagerThread();
    }

    public void enablePager(List<Long> ids) {
        this.pagerMapper.updateDisabledByIds(Boolean.valueOf(false), ids);
        this.restartPagerThread();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Transactional
    public void deletePagerAndAddress(List<Long> ids) {
        List addressIds = this.pagerAddressRecordMapper.findIdByPagerIdIn(ids);
        List addressList = this.pagerAddressRecordMapper.findAddressByPagerIdIn(ids);
        this.pagerMapper.deleteAllById(ids);
        this.pagerAddressRecordMapper.deleteAllById((Iterable)addressIds);
        Object object = pagerDetailMapLock;
        synchronized (object) {
            for (Long pagerId : ids) {
                for (Integer address : addressList) {
                    pagerDetailMap.remove(pagerId + ":" + address);
                }
            }
        }
        this.restartPagerThread();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public List<PagerAddressRecordVo> findPagerAddressById(Long id) {
        List result = this.findPagerAddressFromCacheById(id);
        if (CollectionUtils.isEmpty((Collection)result)) {
            Object object = pagerDetailMapLock;
            synchronized (object) {
                result = this.findPagerAddressFromCacheById(id);
                if (CollectionUtils.isEmpty((Collection)result)) {
                    result = this.findPagerAddressFromDbById(id);
                    for (PagerAddressRecordVo vo : result) {
                        pagerDetailMap.put(vo.getPagerId() + ":" + vo.getAddress(), vo);
                    }
                }
            }
        }
        return result;
    }

    public List<PagerAddressRecordVo> findPagerAddressFromCacheById(Long id) {
        ArrayList<PagerAddressRecordVo> result = new ArrayList<PagerAddressRecordVo>();
        Set entries = pagerDetailMap.entrySet();
        for (Map.Entry entry : entries) {
            if (!((String)entry.getKey()).split(":")[0].equals(id.toString())) continue;
            PagerAddressRecordVo vo = (PagerAddressRecordVo)entry.getValue();
            if (!pagerValueMap.isEmpty() && null != pagerValueMap.get(vo.getId())) {
                vo.setValue((Integer)((List)pagerValueMap.get(vo.getId())).get(0));
                vo.setLightValue((Integer)((List)pagerValueMap.get(vo.getId())).get(1));
            }
            result.add(vo);
        }
        return result;
    }

    public List<PagerAddressRecordVo> findPagerAddressFromDbById(Long id) {
        StringBuilder jpql = new StringBuilder("SELECT r.id, p.id, p.brand, p.deviceName, p.protocolType, p.ip, p.port, p.slaveId, p.functionCode, r.address, r.value, r.remark, r.lightAddress, r.lightValue, r.lightRemark, r.orderTask, r.cancelTask FROM Pager p INNER JOIN PagerAddressRecord r ON p.id = r.pagerId ");
        if (null != id) {
            jpql.append("WHERE p.id = :id ");
            jpql.append("ORDER BY r.address asc");
        } else {
            jpql.append("ORDER BY p.ip, p.id, p.port asc");
        }
        Query query = this.em.createQuery(jpql.toString());
        query.setParameter("id", (Object)id);
        List rows = query.getResultList();
        return this.transRowToList(rows);
    }

    private List<PagerAddressRecordVo> transRowToList(List rows) {
        ArrayList<PagerAddressRecordVo> resultList = new ArrayList<PagerAddressRecordVo>();
        for (Object row : rows) {
            Object[] cells = (Object[])row;
            PagerAddressRecordVo resVo = new PagerAddressRecordVo();
            resVo.setId(cells[0] == null ? null : (Long)cells[0]);
            resVo.setPagerId(cells[1] == null ? null : (Long)cells[1]);
            resVo.setBrandName(cells[2] == null ? null : cells[2].toString());
            resVo.setDeviceName(cells[3] == null ? null : cells[3].toString());
            resVo.setProtocolType(cells[4] == null ? null : cells[4].toString());
            resVo.setIp(cells[5] == null ? null : cells[5].toString());
            resVo.setPort(cells[6] == null ? null : (Integer)cells[6]);
            resVo.setSlaveId(cells[7] == null ? null : (Integer)cells[7]);
            resVo.setFunctionCode(cells[8] == null ? null : cells[8].toString());
            resVo.setAddress(cells[9] == null ? null : (Integer)cells[9]);
            resVo.setValue(cells[10] == null ? null : (Integer)cells[10]);
            resVo.setRemark(cells[11] == null ? null : cells[11].toString());
            resVo.setLightAddress(cells[12] == null ? null : (Integer)cells[12]);
            resVo.setLightValue(cells[13] == null ? null : (Integer)cells[13]);
            resVo.setLightRemark(cells[14] == null ? null : cells[14].toString());
            resVo.setOrderTask(cells[15] == null ? null : cells[15].toString());
            resVo.setCancelTask(cells[16] == null ? null : cells[16].toString());
            resultList.add(resVo);
        }
        return resultList;
    }

    public List<Long> findIdByPagerIdAndAddr(Long pagerId, Integer address) {
        return this.pagerAddressRecordMapper.findIdByPagerIdAndAddr(pagerId, address);
    }

    public List<Integer> findAddressByPagerId(Long pagerId) {
        return this.pagerAddressRecordMapper.findAddressByPagerId(pagerId);
    }

    public List<PagerAddressRecordVo> findPagerByOrderTask(String orderTask) {
        return this.pagerAddressRecordMapper.findPagerByOrderTask(orderTask);
    }

    private List<Pager> getPagerFromPagerAddressRecordVos(List<PagerAddressRecordVo> pagerAddressRecordVos) {
        ArrayList<Pager> pagerList = new ArrayList<Pager>();
        ArrayList<Long> ids = new ArrayList<Long>();
        for (PagerAddressRecordVo vo : pagerAddressRecordVos) {
            if (!ids.isEmpty() && ids.contains(vo.getPagerId())) continue;
            Pager record = Pager.builder().id(vo.getPagerId()).protocolType(vo.getProtocolType()).brand(vo.getBrandName()).deviceName(vo.getDeviceName()).ip(vo.getIp()).port(vo.getPort()).slaveId(vo.getSlaveId()).functionCode(vo.getFunctionCode()).disabled(Boolean.valueOf(true)).createTime(new Date()).build();
            pagerList.add(record);
            ids.add(vo.getPagerId());
        }
        return pagerList;
    }

    private List<PagerAddressRecord> getAddressFromPagerAddressRecordVos(List<PagerAddressRecordVo> pagerAddressRecordVos) {
        ArrayList<PagerAddressRecord> addressList = new ArrayList<PagerAddressRecord>();
        for (PagerAddressRecordVo vo : pagerAddressRecordVos) {
            if (null == vo.getAddress()) continue;
            PagerAddressRecord record = PagerAddressRecord.builder().id(vo.getId()).pagerId(vo.getPagerId()).address(vo.getAddress()).value(vo.getValue()).remark(vo.getRemark()).lightAddress(vo.getLightAddress()).lightValue(vo.getLightValue()).lightRemark(vo.getLightRemark()).orderTask(vo.getOrderTask()).cancelTask(vo.getCancelTask()).createTime(new Date()).build();
            addressList.add(record);
        }
        return addressList;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Transactional
    public void addPagerAddressAndCache(List<PagerAddressRecordVo> pagerAddressRecordVos) {
        List addressList = this.getAddressFromPagerAddressRecordVos(pagerAddressRecordVos);
        List list = this.pagerAddressRecordMapper.saveAll((Iterable)addressList);
        Map<Integer, Long> map = list.stream().collect(Collectors.toMap(PagerAddressRecord::getAddress, PagerAddressRecord::getId));
        Object object = pagerDetailMapLock;
        synchronized (object) {
            for (PagerAddressRecordVo vo : pagerAddressRecordVos) {
                vo.setId(map.get(vo.getAddress()));
                pagerDetailMap.put(vo.getPagerId() + ":" + vo.getAddress(), vo);
            }
        }
        this.restartPagerThread();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Transactional
    public int updatePagerAddressAndCache(PagerAddressRecordVo pagerAddressRecordVo) {
        PagerAddressRecord record = this.pagerAddressRecordMapper.findAddressById(pagerAddressRecordVo.getId());
        Object object = pagerDetailMapLock;
        synchronized (object) {
            pagerDetailMap.remove(record.getPagerId() + ":" + record.getAddress());
            pagerDetailMap.put(pagerAddressRecordVo.getPagerId() + ":" + pagerAddressRecordVo.getAddress(), pagerAddressRecordVo);
        }
        int i = this.pagerAddressRecordMapper.updateRecordById(pagerAddressRecordVo.getAddress(), pagerAddressRecordVo.getRemark(), pagerAddressRecordVo.getLightAddress(), pagerAddressRecordVo.getLightRemark(), pagerAddressRecordVo.getOrderTask(), pagerAddressRecordVo.getCancelTask(), new Date(), pagerAddressRecordVo.getId());
        return i;
    }

    @Transactional
    public void updatePagerValue(PagerAddressRecordVo pagerAddressRecordVo) throws Exception {
        Modbus4jUtils.writeHoldingRegister((String)pagerAddressRecordVo.getIp(), (int)pagerAddressRecordVo.getPort(), (int)pagerAddressRecordVo.getSlaveId(), (int)pagerAddressRecordVo.getAddress(), (int)2, (Object)pagerAddressRecordVo.getValue(), (String)"updatePagerValue");
    }

    @Transactional
    public void updateLightValue(PagerAddressRecordVo pagerAddressRecordVo) throws Exception {
        Modbus4jUtils.writeHoldingRegister((String)pagerAddressRecordVo.getIp(), (int)pagerAddressRecordVo.getPort(), (int)pagerAddressRecordVo.getSlaveId(), (int)pagerAddressRecordVo.getLightAddress(), (int)2, (Object)pagerAddressRecordVo.getLightValue(), (String)"updatePagerLightValue");
    }

    public void updateValuedById(Integer value, Integer lightValue, Long addressId) {
        this.pagerAddressRecordMapper.updateValuedById(value, lightValue, addressId);
    }

    public void updatePagerValuedById(Integer value, Long addressId) {
        this.pagerAddressRecordMapper.updatePagerValuedById(value, addressId);
    }

    public void updateLightValuedById(Integer lightValue, Long addressId) {
        this.pagerAddressRecordMapper.updateLightValuedById(lightValue, addressId);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void deleteAddress(List<Long> ids) {
        if (CollectionUtils.isEmpty(ids)) {
            return;
        }
        List addressList = this.pagerAddressRecordMapper.findAddressByIdIn(ids);
        List pagerIds = this.pagerAddressRecordMapper.findPagerIdById(ids.get(0));
        if (CollectionUtils.isEmpty((Collection)pagerIds)) {
            return;
        }
        this.pagerAddressRecordMapper.deleteAllById(ids);
        Object object = pagerDetailMapLock;
        synchronized (object) {
            for (Integer address : addressList) {
                pagerDetailMap.remove(pagerIds.get(0) + ":" + address);
            }
        }
        this.restartPagerThread();
    }

    @PostConstruct
    private void init() {
        List pagerIds = this.findUnDisabledIdFromPager();
        if (CollectionUtils.isEmpty((Collection)pagerIds)) {
            log.info("\u6ca1\u6709\u53ef\u7528\u7684\u547c\u53eb\u5668\u6570\u636e\u3002");
            return;
        }
        log.info("unDisabled pager ids : {}", (Object)pagerIds);
        this.readPagerValueAndUpdateDataAndRunTask(pagerIds);
    }

    private List<PagerAddressRecordVo> findPagerAddressRecordVosByPagerIds(List<Long> pagerIds) {
        StringBuilder jpql = new StringBuilder("SELECT r.id, p.id, p.brand, p.deviceName, p.protocolType, p.ip, p.port, p.slaveId, p.functionCode, r.address, r.value, r.remark, r.lightAddress, r.lightValue, r.lightRemark, r.orderTask, r.cancelTask FROM Pager p INNER JOIN PagerAddressRecord r ON p.id = r.pagerId ");
        if (CollectionUtils.isNotEmpty(pagerIds)) {
            jpql.append("WHERE p.id in (");
            for (int i = 0; i < pagerIds.size() - 1; ++i) {
                jpql.append(pagerIds.get(i)).append(",");
            }
            jpql.append(pagerIds.get(pagerIds.size() - 1)).append(")").append("ORDER BY r.address asc");
        } else {
            jpql.append("ORDER BY p.ip, p.id, p.port asc");
        }
        Query query = this.em.createQuery(jpql.toString());
        List rows = query.getResultList();
        return this.transRowToList(rows);
    }

    private void readPagerValueAndUpdateDataAndRunTask(List<Long> pagerIds) {
        List values = this.findPagerAddressRecordVosByPagerIds(pagerIds);
        if (CollectionUtils.isEmpty((Collection)values)) {
            log.info("\u6ca1\u6709\u53ef\u7528\u7684\u547c\u53eb\u5668\u5730\u5740\u6570\u636e\u3002");
            return;
        }
        log.info("available pager address vos: {}", (Object)values);
        HashMap pagerMap = new HashMap();
        for (PagerAddressRecordVo pagerAddressRecordVo : values) {
            List pagerAddressRecordVos = (List)pagerMap.get(pagerAddressRecordVo.getPagerId());
            if (CollectionUtils.isEmpty((Collection)pagerAddressRecordVos)) {
                ArrayList<PagerAddressRecordVo> list = new ArrayList<PagerAddressRecordVo>();
                list.add(pagerAddressRecordVo);
                pagerMap.put(pagerAddressRecordVo.getPagerId(), list);
                continue;
            }
            pagerAddressRecordVos.add(pagerAddressRecordVo);
        }
        log.info("pagerMap data: {}", pagerMap);
        this.executorService = new SerialScheduledExecutorService(PropConfig.getPagerThreadNum());
        for (Map.Entry entry : pagerMap.entrySet()) {
            this.executorService.scheduleAtFixedRate(() -> {
                try {
                    short[] pagerValues;
                    List addressRecordVos = (List)entry.getValue();
                    List collect = addressRecordVos.stream().sorted(Comparator.comparing(PagerAddressRecordVo::getAddress)).collect(Collectors.toList());
                    List addresses = collect.stream().map(PagerAddressRecordVo::getAddress).collect(Collectors.toList());
                    List lightAddresses = collect.stream().map(PagerAddressRecordVo::getLightAddress).collect(Collectors.toList());
                    addresses.addAll(lightAddresses);
                    PagerAddressRecordVo addressRecordVo = (PagerAddressRecordVo)collect.get(0);
                    try {
                        int start = (Integer)addresses.get(0);
                        int length = (Integer)addresses.get(addresses.size() - 1) - start + 1;
                        log.info("read pager start, ip:{},port:{},slaveId:{},addresses:{},remark:{}", new Object[]{addressRecordVo.getIp(), addressRecordVo.getPort(), addressRecordVo.getSlaveId(), addresses, addressRecordVo.getRemark()});
                        pagerValues = Modbus4jUtils.batchReadHoldingRegisters((String)addressRecordVo.getIp(), (int)addressRecordVo.getPort(), (int)addressRecordVo.getSlaveId(), (int)start, (int)length, (String)addressRecordVo.getRemark());
                        log.info("read pager end, ip:{},port:{},slaveId:{},addresses:{},remark:{},values = {}", new Object[]{addressRecordVo.getIp(), addressRecordVo.getPort(), addressRecordVo.getSlaveId(), addresses, addressRecordVo.getRemark(), pagerValues});
                    }
                    catch (Exception e) {
                        log.error("read pager failure, ip:{},port:{},slaveId:{},addresses:{},remark:{}", new Object[]{addressRecordVo.getIp(), addressRecordVo.getPort(), addressRecordVo.getSlaveId(), addresses, addressRecordVo.getRemark(), e});
                        return;
                    }
                    for (PagerAddressRecordVo vo : collect) {
                        Integer address = vo.getAddress();
                        Integer lightAddress = vo.getLightAddress();
                        Integer btnValue = null;
                        Integer lightValue = null;
                        if (null != pagerValues) {
                            btnValue = pagerValues[address - 1];
                            lightValue = pagerValues[lightAddress - 1];
                        }
                        log.info("ip:{},port:{},slaveId:{},address:{},remark:{}, oldValue = {}, newValue = {}", new Object[]{vo.getIp(), vo.getPort(), vo.getSlaveId(), vo.getAddress(), vo.getRemark(), vo.getValue(), btnValue});
                        this.generateOrCancelTask(vo.getValue(), btnValue, vo.getOrderTask(), vo.getCancelTask(), vo.getIp() + ":" + vo.getPort() + ":" + vo.getSlaveId() + ":" + vo.getAddress() + ":" + vo.getLightAddress() + ":" + vo.getRemark());
                        List<Integer> list = Arrays.asList(btnValue, lightValue);
                        if (!list.equals(pagerValueMap.get(vo.getId()))) {
                            this.updateValuedById(btnValue, lightValue, vo.getId());
                            pagerValueMap.put(vo.getId(), list);
                        }
                        vo.setValue(btnValue);
                        vo.setLightValue(lightValue);
                    }
                }
                catch (Exception e) {
                    log.error("scheduled task read pager exception.", (Throwable)e);
                }
            }, Long.valueOf(500L), Long.valueOf(1000L), TimeUnit.MILLISECONDS);
        }
    }

    /*
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    private void generateOrCancelTask(Integer oldValue, Integer newValue, String orderTaskName, String cancelTaskName, String pagerInfo) {
        if (null == oldValue) {
            if (null == newValue) {
                return;
            }
            if (1 > newValue) return;
            this.runOrderTask(orderTaskName, pagerInfo);
            return;
        } else if (0 == oldValue) {
            if (null == newValue) {
                return;
            }
            if (1 > newValue) return;
            this.runOrderTask(orderTaskName, pagerInfo);
            return;
        } else {
            if (1 > oldValue) return;
            if (null == newValue) {
                return;
            }
            if (0 != newValue) return;
            this.cancelTaskAndRunCancelTask(orderTaskName, cancelTaskName, pagerInfo);
        }
    }

    private void runOrderTask(String orderTaskName, String pagerInfo) {
        List list = this.findByPagerInfoAndIsDel(pagerInfo, Boolean.valueOf(false));
        if (CollectionUtils.isEmpty((Collection)list) || StringUtils.isEmpty((CharSequence)((PagerTaskRecord)list.get(0)).getTaskRecordId())) {
            AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            String taskRecordId = "pager-start-" + UUID.randomUUID();
            SetOrderReq req = new SetOrderReq();
            req.setTaskLabel(orderTaskName);
            req.setTaskRecordId(taskRecordId);
            agvApiService.asyncSetOrder(req);
            PagerTaskRecord pagerTaskRecord = PagerTaskRecord.builder().taskRecordId(taskRecordId).pagerInfo(pagerInfo).isDel(Boolean.valueOf(false)).build();
            if (CollectionUtils.isNotEmpty((Collection)list)) {
                pagerTaskRecord.setId(((PagerTaskRecord)list.get(0)).getId());
            }
            this.saveOrUpdatePagerTaskRecord(pagerTaskRecord);
            log.info("pager start task: {} success, taskRecordId: {}", (Object)orderTaskName, (Object)taskRecordId);
        } else {
            log.info("pager start task: {} failure, taskRecordId: {} already exist.", (Object)orderTaskName, (Object)((PagerTaskRecord)list.get(0)).getTaskRecordId());
        }
    }

    private void cancelTaskAndRunCancelTask(String orderTaskName, String cancelTaskName, String pagerInfo) {
        List list = this.findByPagerInfoAndIsDel(pagerInfo, Boolean.valueOf(false));
        if (CollectionUtils.isEmpty((Collection)list) || StringUtils.isEmpty((CharSequence)((PagerTaskRecord)list.get(0)).getTaskRecordId())) {
            log.info("task finish or task stop make the pager value reset, not really cancel task.");
            return;
        }
        PagerTaskRecord pagerTaskRecord = (PagerTaskRecord)list.get(0);
        String taskRecordId = pagerTaskRecord.getTaskRecordId();
        String taskId = this.windTaskRecordMapper.getDefIdById(taskRecordId);
        pagerTaskRecord.setIsDel(Boolean.valueOf(true));
        this.saveOrUpdatePagerTaskRecord(pagerTaskRecord);
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
        StopAllTaskReq.StopTask task = new StopAllTaskReq.StopTask(taskId, taskRecordId);
        ArrayList stopList = Lists.newArrayList((Object[])new StopAllTaskReq.StopTask[]{task});
        windService.stopAllTask((List)stopList);
        workSiteService.updateSiteUnlockedByLockedBy(taskRecordId);
        UserMessageService UserMessageService2 = (UserMessageService)SpringUtil.getBean(UserMessageService.class);
        UserMessageService2.addMessageInfo("Cancel Task", "Manual cancel pager task, cancel taskName : " + orderTaskName + " taskRecordId: " + taskRecordId, 1);
        log.info("manual cancel pager task and unlock relation sites, taskRecordId = {}, taskLabel = {}", (Object)taskRecordId, (Object)orderTaskName);
        if (StringUtils.isNotEmpty((CharSequence)cancelTaskName)) {
            SetOrderReq req = new SetOrderReq();
            req.setTaskLabel(cancelTaskName);
            req.setTaskRecordId("pager-cancel-" + UUID.randomUUID());
            agvApiService.asyncSetOrder(req);
        }
    }

    private List<PagerAddressRecordVo> pagerAddressRecordVoListFromDB() {
        ArrayList<PagerAddressRecordVo> dataList = new ArrayList<PagerAddressRecordVo>();
        List pagers = this.findPagerByCondition("", "", "", Boolean.valueOf(false));
        for (Pager pager : pagers) {
            List detailRecords = this.findPagerAddressFromDbById(pager.getId());
            if (detailRecords.isEmpty()) continue;
            dataList.addAll(detailRecords);
        }
        return dataList;
    }

    public List<PagerTaskRecord> findByPagerInfoAndIsDel(String pagerInfo, Boolean isDel) {
        return this.pagerTaskRecordMapper.findByPagerInfoAndIsDel(pagerInfo, isDel);
    }

    public List<PagerTaskRecord> findByTaskRecordId(String taskRecordId) {
        return this.pagerTaskRecordMapper.findByTaskRecordId(taskRecordId);
    }

    public void saveOrUpdatePagerTaskRecord(PagerTaskRecord pagerTaskRecord) {
        this.pagerTaskRecordMapper.save((Object)pagerTaskRecord);
    }
}

