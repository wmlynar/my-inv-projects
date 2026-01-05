/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.SiteGroupTransferDemandStatus
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.SiteGroupDemandMapper
 *  com.seer.rds.model.SiteGroupDemand.SiteGroupDemand
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.SiteGroupDemandService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.SiteGroupDemandVo
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Order
 *  javax.persistence.criteria.Predicate
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateFormatUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.agv;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.SiteGroupTransferDemandStatus;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.SiteGroupDemandMapper;
import com.seer.rds.model.SiteGroupDemand.SiteGroupDemand;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.SiteGroupDemandVo;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.io.IOException;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Order;
import javax.persistence.criteria.Predicate;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class SiteGroupDemandService {
    private static final Logger log = LoggerFactory.getLogger(SiteGroupDemandService.class);
    private final SiteGroupDemandMapper siteGroupDemandMapper;
    private final AgvApiService agvApiService;
    private final WindTaskService windTaskService;
    public static ConcurrentHashMap<String, Integer> siteGroupDemandStatusMap = new ConcurrentHashMap();
    @Value(value="${spring.datasource.databaseType}")
    private String dataBaseType;

    public SiteGroupDemandService(SiteGroupDemandMapper siteGroupDemandMapper, AgvApiService agvApiService, WindTaskService windTaskService) {
        this.siteGroupDemandMapper = siteGroupDemandMapper;
        this.agvApiService = agvApiService;
        this.windTaskService = windTaskService;
    }

    public void addOrUpdate(SiteGroupDemand siteGroupDemand) {
        this.siteGroupDemandMapper.save((Object)siteGroupDemand);
        siteGroupDemandStatusMap.put(siteGroupDemand.getId(), SiteGroupTransferDemandStatus.running.getStatus());
    }

    public List<SiteGroupDemand> showAll() {
        return this.siteGroupDemandMapper.findAll((Specification & Serializable)(root, criteriaQuery, criteriaBuilder) -> {
            criteriaQuery.orderBy(new Order[]{criteriaBuilder.desc((Expression)root.get("createdOn"))});
            return criteriaQuery.getRestriction();
        });
    }

    public void stopAll() {
        List siteGroupDemandList = this.siteGroupDemandMapper.findByNotStopStatus();
        for (SiteGroupDemand siteGroupDemand : siteGroupDemandList) {
            siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.stop.getStatus()));
            siteGroupDemandStatusMap.put(siteGroupDemand.getId(), SiteGroupTransferDemandStatus.stop.getStatus());
            this.siteGroupDemandMapper.save((Object)siteGroupDemand);
        }
    }

    public void stop(String id) {
        this.siteGroupDemandMapper.findById((Object)id).ifPresent(siteGroupDemand -> {
            if (siteGroupDemand.getStatus().intValue() == SiteGroupTransferDemandStatus.stop.getStatus()) {
                throw new RuntimeException("demand has been terminated");
            }
            siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.stop.getStatus()));
            this.siteGroupDemandMapper.save(siteGroupDemand);
            siteGroupDemandStatusMap.put(siteGroupDemand.getId(), SiteGroupTransferDemandStatus.stop.getStatus());
        });
    }

    public void interrupt(String id) {
        this.siteGroupDemandMapper.findById((Object)id).ifPresent(siteGroupDemand -> {
            if (siteGroupDemand.getStatus().intValue() != SiteGroupTransferDemandStatus.running.getStatus()) {
                throw new RuntimeException("demand is not running,can not interrupt");
            }
            siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.interrupt.getStatus()));
            this.siteGroupDemandMapper.save(siteGroupDemand);
            siteGroupDemandStatusMap.put(id, SiteGroupTransferDemandStatus.interrupt.getStatus());
        });
    }

    public void resume(String id) {
        this.siteGroupDemandMapper.findById((Object)id).ifPresent(siteGroupDemand -> {
            if (siteGroupDemand.getStatus().intValue() != SiteGroupTransferDemandStatus.interrupt.getStatus()) {
                throw new RuntimeException("Demand are not suspended without");
            }
            siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.running.getStatus()));
            this.siteGroupDemandMapper.save(siteGroupDemand);
            siteGroupDemandStatusMap.put(id, SiteGroupTransferDemandStatus.running.getStatus());
        });
    }

    public void interruptAll() {
        List siteGroupDemandList = this.siteGroupDemandMapper.findByStatus(SiteGroupTransferDemandStatus.running.getStatus());
        for (SiteGroupDemand siteGroupDemand : siteGroupDemandList) {
            siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.interrupt.getStatus()));
            this.siteGroupDemandMapper.save((Object)siteGroupDemand);
            siteGroupDemandStatusMap.put(siteGroupDemand.getId(), SiteGroupTransferDemandStatus.interrupt.getStatus());
        }
    }

    public void resumeAll() {
        List siteGroupDemandList = this.siteGroupDemandMapper.findByStatus(SiteGroupTransferDemandStatus.interrupt.getStatus());
        for (SiteGroupDemand siteGroupDemand : siteGroupDemandList) {
            siteGroupDemand.setStatus(Integer.valueOf(SiteGroupTransferDemandStatus.running.getStatus()));
            this.siteGroupDemandMapper.save((Object)siteGroupDemand);
            siteGroupDemandStatusMap.put(siteGroupDemand.getId(), SiteGroupTransferDemandStatus.running.getStatus());
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void runDemand(SiteGroupDemand siteGroupDemand) {
        try {
            String vehicleNameList = siteGroupDemand.getVehicleName();
            String group = siteGroupDemand.getGroupName();
            Integer vehicleMaxNumber = siteGroupDemand.getVehicleMaxNumber();
            int vehicleNumber = StringUtils.isNotEmpty((CharSequence)group) ? this.getVehicleNumberByGroup(group) : (StringUtils.isNotEmpty((CharSequence)vehicleNameList) ? 1 : (vehicleMaxNumber != null ? vehicleMaxNumber.intValue() : this.getAllVehicleNumber()));
            int runningVehicleNumber = 0;
            HashMap<String, Boolean> recordMap = new HashMap<String, Boolean>();
            while (SiteGroupTransferDemandStatus.stop.getStatus() != ((Integer)siteGroupDemandStatusMap.get(siteGroupDemand.getId())).intValue()) {
                if (runningVehicleNumber < vehicleNumber) {
                    SetOrderReq setOrderReq = new SetOrderReq();
                    setOrderReq.setTaskLabel("SingleForkScene_siteGroupTransfer");
                    UUID uuid = UUID.randomUUID();
                    setOrderReq.setTaskRecordId(uuid.toString());
                    recordMap.put(uuid.toString(), true);
                    HashMap inputParamsMap = new HashMap();
                    inputParamsMap.put("fromBinAreas", JSONArray.parseArray((String)siteGroupDemand.getFromGroup()));
                    inputParamsMap.put("toBinAreas", JSONArray.parseArray((String)siteGroupDemand.getToGroup()));
                    inputParamsMap.put("group", siteGroupDemand.getGroupName());
                    inputParamsMap.put("vehicleName", siteGroupDemand.getVehicleName());
                    setOrderReq.setInputParams(JSON.toJSONString((Object)inputParamsMap));
                    this.agvApiService.asyncSetOrder(setOrderReq);
                    ++runningVehicleNumber;
                }
                ArrayList keyList = new ArrayList(recordMap.keySet());
                List taskRecordList = this.windTaskService.getTaskRecordById(keyList);
                for (WindTaskRecord taskRecord : taskRecordList) {
                    Integer status = taskRecord.getStatus();
                    if (TaskStatusEnum.stop.getStatus() != status.intValue() && TaskStatusEnum.end_error.getStatus() != status.intValue() && TaskStatusEnum.end.getStatus() != status.intValue() && TaskStatusEnum.manual_end.getStatus() != status.intValue()) continue;
                    recordMap.remove(taskRecord.getId());
                    --runningVehicleNumber;
                }
                while (SiteGroupTransferDemandStatus.interrupt.getStatus() == ((Integer)siteGroupDemandStatusMap.get(siteGroupDemand.getId())).intValue()) {
                    log.info("site group demand is interrupt");
                    try {
                        Thread.sleep(1000L);
                    }
                    catch (InterruptedException e) {
                        log.error("runDemand InterruptedException", (Throwable)e);
                    }
                }
            }
        }
        catch (Exception e) {
            log.error("site group demand run error", (Throwable)e);
        }
        finally {
            siteGroupDemandStatusMap.remove(siteGroupDemand.getId());
            this.stop(siteGroupDemand.getId());
        }
    }

    public int getVehicleNumberByGroup(String group) {
        try {
            String res = OkHttpUtil.get((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.robotsStatus.getUri()));
            String report = JSONObject.parseObject((String)res).getString("report");
            JSONArray reportArray = JSONObject.parseArray((String)report);
            int count = 0;
            for (Object e : reportArray) {
                String basicInfo = JSONObject.parseObject((String)e.toString()).getString("basic_info");
                String currentGroup = JSONObject.parseObject((String)basicInfo).getString("current_group");
                if (!group.equals(currentGroup)) continue;
                ++count;
            }
            int vehicleNumber = count;
            return vehicleNumber;
        }
        catch (IOException e) {
            log.error("getVehicleNumberByGroup IOException", (Throwable)e);
            return 0;
        }
    }

    public int getAllVehicleNumber() {
        try {
            String res = OkHttpUtil.get((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.robotsStatus.getUri()));
            String report = JSONObject.parseObject((String)res).getString("report");
            JSONArray reportArray = JSONObject.parseArray((String)report);
            return reportArray.size();
        }
        catch (IOException e) {
            log.error("getAllVehicleNumber IOException", (Throwable)e);
            return 0;
        }
    }

    public PaginationResponseVo findByConditionForExternalInterfacesPaging(Integer currentPage, Integer pageSize) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize);
        Specification & Serializable spec = (Specification & Serializable)(root, query, cb) -> {
            ArrayList predicates = new ArrayList();
            query.orderBy(new Order[]{cb.desc(root.get("createdOn").as(String.class))});
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        if (pageSize != null && currentPage != 0) {
            PageRequest pageRequest = currentPage != null ? PageRequest.of((int)(currentPage - 1), (int)pageSize) : PageRequest.ofSize((int)pageSize);
            Page all = this.siteGroupDemandMapper.findAll((Specification)spec, (Pageable)pageRequest);
            List siteGroupDemandVos = this.transformationSiteGroup(all.getContent());
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(all.getTotalElements()));
            paginationResponseVo.setCurrentPage(currentPage);
            paginationResponseVo.setPageSize(pageSize);
            paginationResponseVo.setTotalPage(Integer.valueOf(all.getTotalPages()));
            paginationResponseVo.setPageList(siteGroupDemandVos);
            return paginationResponseVo;
        }
        List all = this.siteGroupDemandMapper.findAll((Specification)spec);
        List siteGroupDemandVos = this.transformationSiteGroup(all);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(all.size()));
        paginationResponseVo.setCurrentPage(currentPage);
        paginationResponseVo.setPageSize(pageSize);
        paginationResponseVo.setTotalPage(null);
        paginationResponseVo.setPageList(siteGroupDemandVos);
        return paginationResponseVo;
    }

    public List<SiteGroupDemandVo> transformationSiteGroup(List<SiteGroupDemand> siteGroupDemandList) {
        if (CollectionUtils.isNotEmpty(siteGroupDemandList)) {
            List<SiteGroupDemandVo> collect = siteGroupDemandList.stream().map(e -> {
                SiteGroupDemandVo vo = SiteGroupDemandVo.builder().id(e.getId()).toGroup(e.getToGroup()).fromGroup(e.getFromGroup()).createdOn(e.getCreatedOn() != null ? DateFormatUtils.format((Date)e.getCreatedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").endedOn(e.getEndedOn() != null ? DateFormatUtils.format((Date)e.getEndedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").status(e.getStatus()).vehicleMaxNumber(e.getVehicleMaxNumber()).vehicleName(e.getVehicleName()).groupName(e.getGroupName()).build();
                return vo;
            }).collect(Collectors.toList());
            return collect;
        }
        return null;
    }

    public SiteGroupDemandVo transformationOneSiteGroup(SiteGroupDemand siteGroupDemandList) {
        SiteGroupDemandVo vo = SiteGroupDemandVo.builder().id(siteGroupDemandList.getId()).toGroup(siteGroupDemandList.getToGroup()).fromGroup(siteGroupDemandList.getFromGroup()).createdOn(siteGroupDemandList.getCreatedOn() != null ? DateFormatUtils.format((Date)siteGroupDemandList.getCreatedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").endedOn(siteGroupDemandList.getEndedOn() != null ? DateFormatUtils.format((Date)siteGroupDemandList.getEndedOn(), (String)"yyyy-MM-dd HH:mm:ss") : "").status(siteGroupDemandList.getStatus()).vehicleMaxNumber(siteGroupDemandList.getVehicleMaxNumber()).vehicleName(siteGroupDemandList.getVehicleName()).groupName(siteGroupDemandList.getGroupName()).build();
        return vo;
    }

    public SiteGroupDemandVo getById(String id) {
        SiteGroupDemand site_group_demand_not_exist = (SiteGroupDemand)this.siteGroupDemandMapper.findById((Object)id).orElseThrow(() -> new RuntimeException("site group demand not exist"));
        SiteGroupDemandVo siteGroupDemandVo = this.transformationOneSiteGroup(site_group_demand_not_exist);
        return siteGroupDemandVo;
    }

    public int getNotStopped() {
        return this.siteGroupDemandMapper.findByNotStopStatus().size();
    }
}

