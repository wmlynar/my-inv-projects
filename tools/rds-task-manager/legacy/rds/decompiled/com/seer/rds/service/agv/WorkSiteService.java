/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.entity.params.ExcelExportEntity
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.AlarmExceptionTypeEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.constant.WorkExcelTitleEnum
 *  com.seer.rds.dao.SysAlarmMapper
 *  com.seer.rds.dao.WorkSiteAttrDataMapper
 *  com.seer.rds.dao.WorkSiteAttrMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.dao.WorkSiteTagsMapper
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.model.worksite.WorkSiteAttr
 *  com.seer.rds.model.worksite.WorkSiteAttrData
 *  com.seer.rds.runnable.RobotsStatusRunnable
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.agv.WorkSiteService$1
 *  com.seer.rds.service.agv.WorkSiteService$2
 *  com.seer.rds.service.agv.WorkSiteService$3
 *  com.seer.rds.service.agv.WorkSiteService$4
 *  com.seer.rds.service.agv.WorkSiteService$5
 *  com.seer.rds.service.agv.WorkSiteService$6
 *  com.seer.rds.service.agv.WorkSiteService$7
 *  com.seer.rds.service.system.DataPermissionManager
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.MD5Utils
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.WorkSiteAttrDataUpdateVo
 *  com.seer.rds.vo.WorkSiteBasicFieldVo
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  com.seer.rds.vo.WorkSiteReqAndRespVo
 *  com.seer.rds.vo.WorkSiteVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.persistence.Query
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
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
 *  org.springframework.transaction.annotation.Propagation
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import cn.afterturn.easypoi.excel.entity.params.ExcelExportEntity;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.AlarmExceptionTypeEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.constant.WorkExcelTitleEnum;
import com.seer.rds.dao.SysAlarmMapper;
import com.seer.rds.dao.WorkSiteAttrDataMapper;
import com.seer.rds.dao.WorkSiteAttrMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.dao.WorkSiteTagsMapper;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.model.worksite.WorkSiteAttr;
import com.seer.rds.model.worksite.WorkSiteAttrData;
import com.seer.rds.runnable.RobotsStatusRunnable;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.system.DataPermissionManager;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.MD5Utils;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.vo.AttrVo;
import com.seer.rds.vo.WorkSiteAttrDataUpdateVo;
import com.seer.rds.vo.WorkSiteBasicFieldVo;
import com.seer.rds.vo.WorkSiteHqlCondition;
import com.seer.rds.vo.WorkSiteReqAndRespVo;
import com.seer.rds.vo.WorkSiteVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/*
 * Exception performing whole class analysis ignored.
 */
@Service
public class WorkSiteService {
    private static final Logger log = LoggerFactory.getLogger(WorkSiteService.class);
    @PersistenceContext
    private EntityManager em;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private WorkSiteAttrDataMapper workSiteAttrDataMapper;
    @Autowired
    private WorkSiteAttrMapper workSiteAttrMapper;
    @Autowired
    private WorkSiteTagsMapper workSiteTagsMapper;
    @Autowired
    private SysAlarmService sysAlarmService;
    @Autowired
    private DataPermissionManager dataPermissionManager;
    @Autowired
    private SysAlarmMapper sysAlarmMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;

    public WorkSite findBySiteId(String siteId) {
        List siteList = this.workSiteMapper.findBySiteId(siteId);
        if (CollectionUtils.isNotEmpty((Collection)siteList)) {
            return (WorkSite)siteList.get(0);
        }
        return null;
    }

    public List<String> findWorkSiteGroups() {
        List workSiteGroups = this.workSiteMapper.findWorkSiteGroups();
        if (CollectionUtils.isNotEmpty((Collection)workSiteGroups) && workSiteGroups.size() > 0) {
            workSiteGroups = workSiteGroups.stream().filter(group -> group != null && !group.isBlank()).collect(Collectors.toList());
        }
        return workSiteGroups;
    }

    public long findCountBySiteIdAndLockedAndFilled(String siteId, Integer locked, Integer filled) {
        return this.workSiteMapper.findBySiteIdAndLockedAndFilled(siteId, locked, filled).stream().count();
    }

    public List<WorkSite> findAllLogicSites() {
        return this.workSiteMapper.findAllLogicSites();
    }

    public List<WorkSite> findAllOrderBy(String orderType, String orderField) {
        return this.workSiteMapper.findAll(Sort.by((Sort.Direction)Sort.Direction.fromString((String)orderType), (String[])new String[]{orderField, "siteId"}));
    }

    public List<WorkSite> findByConditionForExternalInterfaces(String siteId, String siteName, String area, Integer locked, String lockedBy, Integer filled, Integer disabled, Integer syncFailed, String content, Integer type, String groupName, String orderType, String orderField) {
        1 spec = new /* Unavailable Anonymous Inner Class!! */;
        return this.workSiteMapper.findAll((Specification)spec, Sort.by((Sort.Direction)Sort.Direction.fromString((String)orderType), (String[])new String[]{orderField, "siteId"}));
    }

    public Page<WorkSite> findByConditionForExternalInterfacesPaging(String siteId, String siteName, String area, Integer locked, String lockedBy, Integer filled, Integer disabled, Integer syncFailed, String content, Integer type, String groupName, String tags, int currentPage, int pageSize, String orderType, String orderField, boolean needShiro) {
        List authorizedGroups = needShiro ? this.dataPermissionManager.getAuthorizedGetGroups() : Collections.emptyList();
        2 spec = new /* Unavailable Anonymous Inner Class!! */;
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize, (Sort)Sort.by((Sort.Direction)Sort.Direction.fromString((String)orderType), (String[])new String[]{orderField, "siteId"}));
        return this.workSiteMapper.findAll((Specification)spec, (Pageable)pageable);
    }

    public String findExtAttrIdByAttrName(String attrName) {
        return this.workSiteAttrMapper.findIdByName(attrName);
    }

    public List<String> findValueByNameAndSiteId(String attributeName, String siteId) {
        return this.workSiteAttrDataMapper.findValueByNameAndSiteId(attributeName, siteId);
    }

    public void deleteWorkSiteByType(Integer type) {
        this.workSiteMapper.deleteByType(type);
    }

    @Transactional
    public void deleteBySiteId(String siteId) {
        this.workSiteMapper.deleteBySiteId(siteId);
        this.workSiteAttrDataMapper.deleteBySiteId(siteId);
    }

    @Transactional
    public void deleteExtField(String attrName, String attributeId) {
        this.workSiteAttrMapper.deleteByAttributeName(attrName);
        this.workSiteAttrDataMapper.deleteByAttributeId(attributeId);
    }

    public List<WorkSite> findAllOrderByTypeAsc() {
        return this.workSiteMapper.findOrderByTypeAsc();
    }

    public List<WorkSite> findByAreaOrderBySiteIdAsc(List<String> area) {
        return this.workSiteMapper.findByAreaInOrderBySiteIdAsc(area);
    }

    public List<WorkSite> findByAreaOrderBySiteIdDesc(List<String> area) {
        return this.workSiteMapper.findByAreaInOrderBySiteIdDesc(area);
    }

    public List<WorkSite> findBySiteLabelIn(List<String> siteLabels) {
        return this.workSiteMapper.findBySiteIdIn(siteLabels);
    }

    public List<WorkSite> findBySiteLabelIn(List<String> siteLabels, String agvId) {
        return this.workSiteMapper.findByAgvIdAndSiteIdIn(agvId, siteLabels);
    }

    public List<WorkSite> findByAgvId(String agvId) {
        return this.workSiteMapper.findByAgvId(agvId);
    }

    public List<String> findSiteIdsByLockedBy(String taskRecordId) {
        return this.workSiteMapper.findSiteIdsByLockedBy(taskRecordId);
    }

    public List<String> findSiteIdsInLockedBy(List<String> taskRecordIds) {
        return this.workSiteMapper.findSiteIdsInLockedBy(taskRecordIds);
    }

    public List<String> findAllLockedSiteIds() {
        return this.workSiteMapper.findAllLockedSiteIds();
    }

    public List<String> findAllUnLockedSiteIds() {
        return this.workSiteMapper.findAllUnLockedSiteIds();
    }

    public int updateSiteUnlockedInLockedBy(List<String> taskRecordIds) {
        return this.workSiteMapper.updateSiteUnlockedInLockedBy(taskRecordIds);
    }

    public int unlockSiteBySiteIdIn(List<String> siteIds) {
        return this.workSiteMapper.unlockSiteBySiteIdIn(siteIds);
    }

    public int updateFilledStatus(int filled, String siteId) {
        return this.workSiteMapper.updateFilledStatus(filled, siteId);
    }

    @Transactional
    public void updateSite(WorkSite site) {
        this.workSiteMapper.save((Object)site);
    }

    @Transactional
    public int saveOrUpdateSceneSite(List<WorkSite> sceneSites) {
        if (CollectionUtils.isEmpty(sceneSites)) {
            this.deleteWorkSiteByType(Integer.valueOf(1));
            return 0;
        }
        List existPhysicSites = this.workSiteMapper.findByType(Integer.valueOf(1));
        List logicSites = this.workSiteMapper.findAllLogicSites();
        ArrayList existPhysicSiteIds = Lists.newArrayList();
        ArrayList logicSiteIds = Lists.newArrayList();
        HashMap existedSiteMap = Maps.newHashMap();
        if (CollectionUtils.isNotEmpty((Collection)existPhysicSites)) {
            for (WorkSite existPhysicSite : existPhysicSites) {
                existPhysicSiteIds.add(existPhysicSite.getSiteId());
                existedSiteMap.put(existPhysicSite.getSiteId(), existPhysicSite);
            }
        }
        if (CollectionUtils.isNotEmpty((Collection)logicSites)) {
            for (WorkSite logicSite : logicSites) {
                logicSiteIds.add(logicSite.getSiteId());
            }
        }
        HashSet<String> sceneSiteIds = new HashSet<String>();
        boolean mapHasError = false;
        for (WorkSite site : sceneSites) {
            if (sceneSiteIds.contains(site.getSiteId()) || logicSiteIds.contains(site.getSiteId())) {
                List alarms = this.sysAlarmMapper.findByCode(CommonCodeEnum.MAP_DUPLICATE_SITE_ERROR.getCode());
                if (CollectionUtils.isEmpty((Collection)alarms)) {
                    this.sysAlarmService.addAlarmInfo(CommonCodeEnum.MAP_DUPLICATE_SITE_ERROR.getCode().intValue(), AlarmExceptionTypeEnum.ERROR.getStatus(), "Duplicate siteId:" + site.getSiteId() + " exist in the map");
                    mapHasError = true;
                    this.sysAlarmService.noticeWebWithAlarmInfo();
                }
                log.error("Duplicate siteId:" + site.getSiteId() + " exist in the map");
                continue;
            }
            sceneSiteIds.add(site.getSiteId());
        }
        if (!mapHasError) {
            this.sysAlarmService.deleteAlarmAndNoticeWeb(CommonCodeEnum.MAP_DUPLICATE_SITE_ERROR.getCode().intValue());
        }
        List _sceneSiteIds = sceneSites.stream().map(WorkSite::getSiteId).collect(Collectors.toList());
        ArrayList existSiteIdsDiff = new ArrayList(existPhysicSiteIds);
        existSiteIdsDiff.removeAll(_sceneSiteIds);
        if (CollectionUtils.isNotEmpty(existSiteIdsDiff)) {
            this.workSiteMapper.deleteBySiteIds(existSiteIdsDiff);
            this.workSiteAttrDataMapper.deleteBySiteIds(existSiteIdsDiff);
        }
        sceneSiteIds.removeAll(existPhysicSiteIds);
        Map<String, WorkSite> sceneSiteMap = sceneSites.stream().collect(Collectors.toMap(WorkSite::getSiteId, WorkSite2 -> WorkSite2));
        if (CollectionUtils.isNotEmpty(sceneSiteIds)) {
            ArrayList<WorkSite> newSiteList = new ArrayList<WorkSite>();
            for (String newSiteId : sceneSiteIds) {
                WorkSite workSite = sceneSiteMap.get(newSiteId);
                workSite.setLocked(Integer.valueOf(SiteStatusEnum.unlock.getStatus()));
                workSite.setFilled(Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
                workSite.setDisabled(Integer.valueOf(SiteStatusEnum.undisabled.getStatus()));
                workSite.setSyncFailed(Integer.valueOf(SiteStatusEnum.synnofailed.getStatus()));
                workSite.setHolder(Integer.valueOf(SiteStatusEnum.holdByRds.getStatus()));
                newSiteList.add(workSite);
            }
            this.workSiteMapper.saveAll(newSiteList);
        }
        ArrayList<WorkSite> oldSiteList = new ArrayList<WorkSite>();
        for (WorkSite workSite : sceneSites) {
            WorkSite oldSite = (WorkSite)existedSiteMap.get(workSite.getSiteId());
            if (oldSite == null || Objects.equals(oldSite.getArea(), workSite.getArea()) && Objects.equals(oldSite.getGroupName(), workSite.getGroupName())) continue;
            oldSite.setGroupName(workSite.getGroupName());
            oldSite.setArea(workSite.getArea());
            oldSiteList.add(oldSite);
        }
        if (CollectionUtils.isNotEmpty(oldSiteList)) {
            this.workSiteMapper.saveAll(oldSiteList);
        }
        return 0;
    }

    @Transactional
    public void importSite(List<Map> sites) throws RuntimeException {
        this.saveWorkSiteFromMapList(sites);
        this.saveExtFieldsAndDataFromMapList(sites);
    }

    @Transactional
    public List<WorkSiteVo> unlockWorkSite(List<String> siteLabels, String agvId) {
        ArrayList res = Lists.newArrayList();
        List sites = Lists.newArrayList();
        sites = CollectionUtils.isEmpty(siteLabels) ? this.workSiteMapper.findAll() : this.findBySiteLabelIn(siteLabels);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            for (WorkSite site : sites) {
                WorkSiteVo vo;
                if (agvId.equals(site.getAgvId())) {
                    site.setLocked(Integer.valueOf(SiteStatusEnum.unlock.getStatus()));
                    site.setWorking(Integer.valueOf(SiteStatusEnum.unworking.getStatus()));
                    site.setAgvId(null);
                    site.setContent(null);
                    this.workSiteMapper.save((Object)site);
                    vo = new WorkSiteVo(site.getSiteId(), Boolean.valueOf(true), agvId);
                    res.add(vo);
                    continue;
                }
                vo = new WorkSiteVo(site.getSiteId(), Boolean.valueOf(false), agvId);
                res.add(vo);
            }
        }
        return res;
    }

    @Deprecated
    @Transactional
    public List<WorkSiteVo> lockWorkSite(List<String> siteLabels, String agvId) {
        ArrayList res = Lists.newArrayList();
        List sites = Lists.newArrayList();
        sites = CollectionUtils.isEmpty(siteLabels) ? this.workSiteMapper.findAll() : this.findBySiteLabelIn(siteLabels);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            for (WorkSite site : sites) {
                WorkSiteVo vo;
                boolean siteState = this.checkAvailableAndUnfilledSite(site.getSiteId(), agvId);
                if (siteState) {
                    site.setLocked(Integer.valueOf(SiteStatusEnum.lock.getStatus()));
                    site.setWorking(Integer.valueOf(SiteStatusEnum.working.getStatus()));
                    site.setAgvId(agvId);
                    site.setContent(agvId + "\u9501\u5b9a\u7ad9\u70b9");
                    this.workSiteMapper.save((Object)site);
                    vo = new WorkSiteVo(site.getSiteId(), Boolean.valueOf(true), agvId);
                    res.add(vo);
                    continue;
                }
                vo = new WorkSiteVo(site.getSiteId(), Boolean.valueOf(false), site.getAgvId());
                res.add(vo);
            }
        }
        return res;
    }

    public WorkSite getWorkSite(String siteName) {
        List allBySiteLabel = this.workSiteMapper.findBySiteId(siteName);
        if (CollectionUtils.isNotEmpty((Collection)allBySiteLabel)) {
            WorkSite site = (WorkSite)allBySiteLabel.get(0);
            if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                log.error("site is disabled or syn failed");
                return null;
            }
            return site;
        }
        return null;
    }

    public List<WorkSite> getSitesBySiteIdOrderBySiteIdAsc(List<String> siteIds) {
        ArrayList siteList = Lists.newArrayList();
        for (String siteId : siteIds) {
            List sites = this.workSiteMapper.findBySiteIdLikeOrderBySiteIdAsc("%" + siteId + "%");
            for (WorkSite site : sites) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed,continue...");
                    continue;
                }
                siteList.add(site);
            }
        }
        return siteList;
    }

    public List<WorkSite> getSiteBySiteIdOrderBySiteIdDesc(List<String> siteIds) {
        ArrayList siteList = Lists.newArrayList();
        for (String siteId : siteIds) {
            List sites = this.workSiteMapper.findBySiteIdLikeOrderBySiteIdDesc("%" + siteId + "%");
            if (!CollectionUtils.isNotEmpty((Collection)sites)) continue;
            siteList.addAll(sites);
        }
        return siteList;
    }

    public List<WorkSite> getSiteByGroupNameOrderBySiteIdDesc(List<String> GroupNames) {
        ArrayList siteList = Lists.newArrayList();
        for (String area : GroupNames) {
            List sites = this.workSiteMapper.findByGroupNameOrderBySiteIdDesc(area);
            if (!CollectionUtils.isNotEmpty((Collection)sites)) continue;
            for (WorkSite site : sites) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed");
                    continue;
                }
                siteList.add(site);
            }
        }
        return siteList;
    }

    public List<WorkSite> getSitesByGroups(List<String> groups) {
        ArrayList siteList = Lists.newArrayList();
        for (String group : groups) {
            List sites = this.workSiteMapper.findByGroupName(group);
            if (!CollectionUtils.isNotEmpty((Collection)sites)) continue;
            for (WorkSite site : sites) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed");
                    continue;
                }
                siteList.add(site);
            }
        }
        return siteList;
    }

    public List<WorkSite> getSiteByTags(List<String> tags) {
        ArrayList siteList = Lists.newArrayList();
        for (String tag : tags) {
            List sites = this.workSiteMapper.findSiteListByTags(tag);
            if (!CollectionUtils.isNotEmpty((Collection)sites)) continue;
            for (WorkSite site : sites) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed");
                    continue;
                }
                siteList.add(site);
            }
        }
        return siteList;
    }

    public List<WorkSite> getSiteByLikeSiteIdAsc(String siteId) {
        List sites = this.workSiteMapper.findBySiteIdLikeOrderBySiteIdAsc("%" + siteId + "%");
        return sites;
    }

    public boolean checkWorkSiteStateByTaskId(String siteLabel, String taskId) {
        WorkSite workSite = this.getWorkSite(siteLabel);
        log.info("checkAvailableAndUnfilledSite query workSite={}", (Object)workSite);
        if (workSite == null) {
            return false;
        }
        if (!taskId.equals(workSite.getLockedBy())) {
            return false;
        }
        if (workSite.getWorking() != null && workSite.getWorking().intValue() != SiteStatusEnum.unworking.getStatus()) {
            return false;
        }
        if (workSite.getDisabled() != null && workSite.getDisabled().intValue() != SiteStatusEnum.undisabled.getStatus()) {
            return false;
        }
        if (workSite.getLocked() != null && workSite.getLocked().intValue() != SiteStatusEnum.unlock.getStatus()) {
            return false;
        }
        return workSite.getPreparing() == null || workSite.getPreparing().intValue() == SiteStatusEnum.preparing.getStatus();
    }

    public boolean checkAvailableAndUnfilledSite(WorkSite workSite) {
        if (workSite == null) {
            return false;
        }
        if (workSite.getWorking() != null && workSite.getWorking().intValue() != SiteStatusEnum.unworking.getStatus()) {
            return false;
        }
        if (workSite.getDisabled() != null && workSite.getDisabled().intValue() != SiteStatusEnum.undisabled.getStatus()) {
            return false;
        }
        if (workSite.getLocked() != null && workSite.getLocked().intValue() != SiteStatusEnum.unlock.getStatus()) {
            return false;
        }
        if (workSite.getPreparing() != null && workSite.getPreparing().intValue() != SiteStatusEnum.preparing.getStatus()) {
            return false;
        }
        if (workSite.getFilled() != null && workSite.getFilled().intValue() != SiteStatusEnum.unfilled.getStatus()) {
            return false;
        }
        return workSite.getSyncFailed() == null || workSite.getSyncFailed().intValue() == SiteStatusEnum.synnofailed.getStatus();
    }

    @Deprecated
    public boolean checkAvailableAndUnfilledSite(String siteLabel, String agvId) {
        WorkSite workSite = this.getWorkSite(siteLabel);
        log.info("checkAvailableAndUnfilledSite query workSite={}", (Object)workSite);
        if (workSite == null) {
            return false;
        }
        if (agvId.equals(workSite.getAgvId())) {
            return true;
        }
        if (workSite.getWorking() != null && workSite.getWorking().intValue() != SiteStatusEnum.unworking.getStatus()) {
            return false;
        }
        if (workSite.getDisabled() != null && workSite.getDisabled().intValue() != SiteStatusEnum.undisabled.getStatus()) {
            return false;
        }
        if (workSite.getLocked() != null && workSite.getLocked().intValue() != SiteStatusEnum.unlock.getStatus()) {
            return false;
        }
        return workSite.getPreparing() == null || workSite.getPreparing().intValue() == SiteStatusEnum.preparing.getStatus();
    }

    public static List<WorkSite> getSitesFromScene(String path) {
        ArrayList sites = Lists.newArrayList();
        List scene = ResourceUtil.readFileToString((String)path, (String)"scene");
        CompletableFuture<Void> cf = CompletableFuture.runAsync(() -> WorkSiteService.cacheSceneInfo((List)scene));
        String sceneMd5 = MD5Utils.MD5((String)((String)scene.get(0)));
        GlobalCacheConfig.cache((String)"sceneMd5CacheKey", (Object)sceneMd5);
        if (scene != null && scene.size() > 0) {
            int i;
            JSONObject sceneJson = JSONObject.parseObject((String)((String)scene.get(0)));
            JSONArray binAreas = sceneJson.getJSONArray("binAreas");
            JSONArray areas = sceneJson.getJSONArray("areas");
            for (i = 0; i < areas.size(); ++i) {
                JSONObject area = areas.getJSONObject(i);
                String areaName = area.getString("name");
                JSONObject logicalMap = area.getJSONObject("logicalMap");
                JSONArray binLocationsList = logicalMap.getJSONArray("binLocationsList");
                if (binLocationsList == null || binLocationsList.size() <= 0) continue;
                for (int j = 0; j < binLocationsList.size(); ++j) {
                    JSONObject binLocationListJson = binLocationsList.getJSONObject(j);
                    JSONArray binLocationList = binLocationListJson.getJSONArray("binLocationList");
                    if (binLocationList == null) continue;
                    for (int k = 0; k < binLocationList.size(); ++k) {
                        JSONObject binLocation = binLocationList.getJSONObject(k);
                        String instanceName = binLocation.getString("instanceName");
                        String groupName = binLocation.getString("groupName");
                        WorkSite site = new WorkSite();
                        site.setArea(areaName);
                        site.setSiteId(instanceName);
                        site.setType(Integer.valueOf(1));
                        if (binAreas == null || binAreas.size() == 0) {
                            site.setGroupName(groupName);
                        }
                        site.setLocked(Integer.valueOf(SiteStatusEnum.unlock.getStatus()));
                        site.setFilled(Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
                        site.setDisabled(Integer.valueOf(SiteStatusEnum.undisabled.getStatus()));
                        site.setSyncFailed(Integer.valueOf(SiteStatusEnum.synnofailed.getStatus()));
                        sites.add(site);
                    }
                }
            }
            if (binAreas != null) {
                for (i = 0; i < binAreas.size(); ++i) {
                    JSONObject binArea = binAreas.getJSONObject(i);
                    String groupName = binArea.getString("name");
                    JSONArray binList = binArea.getJSONArray("locationNameList");
                    for (int j = 0; j < binList.size(); ++j) {
                        String bin = binList.getString(j);
                        for (WorkSite site : sites) {
                            if (!site.getSiteId().equals(bin)) continue;
                            site.setGroupName(groupName);
                        }
                    }
                }
            }
        }
        try {
            cf.get();
        }
        catch (Exception e) {
            log.error("cacheSceneInfo cf.get() error {}", (Object)e.getMessage());
        }
        return sites;
    }

    private static void cacheSceneInfo(List<String> scene) {
        RobotsStatusRunnable.points.clear();
        RobotsStatusRunnable.label.clear();
        RobotsStatusRunnable.robotId.clear();
        RobotsStatusRunnable.group.clear();
        RobotsStatusRunnable.binTask.clear();
        if (CollectionUtils.isEmpty(scene)) {
            return;
        }
        JSONObject sceneJson = JSONObject.parseObject((String)scene.get(0));
        try {
            WorkSiteService.cacheRobotInfo((JSONObject)sceneJson);
            WorkSiteService.cacheSceneBinTask((JSONObject)sceneJson);
        }
        catch (Exception e) {
            log.error("cacheSceneInfo error {}", (Object)e.getMessage());
        }
    }

    private static void cacheSceneBinTask(JSONObject sceneJson) {
        JSONArray areas = sceneJson.getJSONArray("areas");
        JSONArray tmp = new JSONArray();
        for (int i = 0; i < areas.size(); ++i) {
            JSONObject area = areas.getJSONObject(i);
            String areaName = area.getString("name");
            JSONObject logicalMap = area.getJSONObject("logicalMap");
            JSONArray binLocationsList = logicalMap.getJSONArray("binLocationsList");
            JSONArray advancedPoints = logicalMap.getJSONArray("advancedPoints");
            WorkSiteService.cachePoint((JSONArray)advancedPoints, (String)areaName);
            if (binLocationsList == null || binLocationsList.size() <= 0) continue;
            for (int j = 0; j < binLocationsList.size(); ++j) {
                JSONObject binLocationListJson = binLocationsList.getJSONObject(j);
                JSONArray binLocationList = binLocationListJson.getJSONArray("binLocationList");
                if (binLocationList == null) continue;
                for (int k = 0; k < binLocationList.size(); ++k) {
                    JSONObject binLocation = binLocationList.getJSONObject(k);
                    JSONArray property = binLocation.getJSONArray("property");
                    if (!CollectionUtils.isNotEmpty((Collection)property)) continue;
                    tmp.addAll((Collection)property);
                }
            }
        }
        for (int m = 0; m < tmp.size(); ++m) {
            String stringValue;
            if (!StringUtils.equals((CharSequence)tmp.getJSONObject(m).getString("key"), (CharSequence)"binTask") || StringUtils.isEmpty((CharSequence)(stringValue = tmp.getJSONObject(m).getString("stringValue")))) continue;
            JSONArray v = JSONArray.parseArray((String)stringValue);
            for (int o = 0; o < v.size(); ++o) {
                RobotsStatusRunnable.binTask.addAll(v.getJSONObject(o).keySet());
            }
        }
    }

    private static void cachePoint(JSONArray advancedPoints, String areaName) {
        List instanceName = advancedPoints.stream().map(it -> ((JSONObject)it).getString("instanceName")).collect(Collectors.toList());
        RobotsStatusRunnable.points.put(areaName, instanceName);
    }

    private static void cacheRobotInfo(JSONObject sceneJson) {
        JSONArray labels;
        JSONArray robotGroup = sceneJson.getJSONArray("robotGroup");
        if (robotGroup != null) {
            for (int i = 0; i < robotGroup.size(); ++i) {
                JSONArray robot;
                String group = robotGroup.getJSONObject(i).getString("name");
                if (StringUtils.isNotEmpty((CharSequence)group)) {
                    RobotsStatusRunnable.group.add(group);
                }
                if ((robot = robotGroup.getJSONObject(i).getJSONArray("robot")) == null) continue;
                for (int j = 0; j < robot.size(); ++j) {
                    String robotId = robot.getJSONObject(j).getString("id");
                    if (!StringUtils.isNotEmpty((CharSequence)robotId)) continue;
                    RobotsStatusRunnable.robotId.add(robotId);
                }
            }
        }
        if ((labels = sceneJson.getJSONArray("labels")) != null) {
            for (int i = 0; i < labels.size(); ++i) {
                String label = labels.getJSONObject(i).getString("name");
                if (!StringUtils.isNotEmpty((CharSequence)label)) continue;
                RobotsStatusRunnable.label.add(label);
            }
        }
    }

    public WorkSite getSiteByAreaAndSiteId(String area, String siteId) {
        List sites = this.workSiteMapper.findByAreaAndSiteId(area, siteId);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            return (WorkSite)sites.get(0);
        }
        return null;
    }

    public List<WorkSite> getUnlockSiteByTagsAndContent(List<String> tags, String content) {
        List siteList = this.workSiteMapper.getUnlockSiteByTagsAndContent(tags, content);
        return siteList;
    }

    public List<WorkSite> findBySiteIdLikeOrderBySiteIdDesc(String siteId) {
        return this.workSiteMapper.findBySiteIdLikeOrderBySiteIdAsc(siteId);
    }

    public List<WorkSite> getSitesByTagsAndContents(List<String> tags, List<String> contents) {
        List sites = this.workSiteMapper.findSiteByTagsAndContents(tags, contents);
        return sites;
    }

    public void setWorksiteLockedByById(String siteId, String taskRecordId) {
        this.workSiteMapper.setWorksiteLockedByById(siteId, taskRecordId);
    }

    public int updateSiteUnlockedByLockedBy(String taskRecordId) {
        return this.workSiteMapper.updateSiteUnlockedByLockedBy(taskRecordId);
    }

    public WorkSite findByCondition(String siteId, String content, Integer filled, Integer type, String groupName, boolean isLocked, boolean orderDesc) {
        3 spec = new /* Unavailable Anonymous Inner Class!! */;
        List sites = this.workSiteMapper.findAll((Specification)spec);
        return CollectionUtils.isNotEmpty((Collection)sites) ? (WorkSite)sites.get(0) : null;
    }

    public List<WorkSite> findByFilledAndLocked(Integer filled, Integer locked) {
        4 spec = new /* Unavailable Anonymous Inner Class!! */;
        List sites = this.workSiteMapper.findAll((Specification)spec);
        return sites;
    }

    public PaginationResponseVo findByFilledAndLockedPagination(int currentPage, int pageSize, Integer filled, Integer locked) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize);
        5 spec = new /* Unavailable Anonymous Inner Class!! */;
        Page sites = this.workSiteMapper.findAll((Specification)spec, (Pageable)pageable);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(sites.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currentPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(sites.getTotalPages()));
        paginationResponseVo.setPageList(sites.getContent());
        return paginationResponseVo;
    }

    public List<WorkSite> findSitesByCondition(WorkSiteHqlCondition condition) {
        String hql = "select s from WorkSite s where 1=1 ";
        hql = this.genAndWhereHQLString(condition, hql);
        Query query = this.em.createQuery(hql);
        List resultList = query.getResultList();
        return resultList;
    }

    private String genAndWhereHQLString(WorkSiteHqlCondition condition, String hql) {
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getSiteIds(), "siteId");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getSiteNames(), "siteName");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getGroupNames(), "groupName");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getContent(), "content");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getTags(), "tags");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getRowNum(), "rowNum");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getLevel(), "level");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getColNum(), "colNum");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getDepth(), "depth");
        hql = this.transformSiteColumnQueryHql((String)hql, condition.getNo(), "no");
        if (StringUtils.isNotEmpty((CharSequence)condition.getArea())) {
            hql = (String)hql + " and area = '" + condition.getArea() + "'";
        }
        if (condition.getLocked() != null) {
            hql = (String)hql + " and locked = " + (condition.getLocked() != false ? 1 : 0);
        }
        if (StringUtils.isNotEmpty((CharSequence)condition.getLockedBy())) {
            hql = (String)hql + " and lockedBy = '" + condition.getLockedBy() + "'";
        }
        if (condition.getFilled() != null) {
            hql = (String)hql + " and filled = " + (condition.getFilled() != false ? 1 : 0);
        }
        if (condition.getType() != null) {
            hql = (String)hql + " and type = " + condition.getType();
        }
        if (condition.getDisabled() != null) {
            hql = (String)hql + " and disabled = " + (condition.getDisabled() != false ? 1 : 0);
        }
        if (condition.getSyncFailed() != null) {
            hql = (String)hql + " and syncFailed = " + (condition.getSyncFailed() != false ? 1 : 0);
        }
        if (StringUtils.isNotEmpty((CharSequence)condition.getSort()) && "ASC".equalsIgnoreCase(condition.getSort()) || "DESC".equalsIgnoreCase(condition.getSort())) {
            hql = (String)hql + " order by siteId " + condition.getSort();
        }
        return hql;
    }

    private String transformSiteColumnQueryHql(String hql, String[] conditionArray, String columnName) {
        if (conditionArray != null && conditionArray.length > 0) {
            hql = (String)hql + " and ";
            ArrayList like = Lists.newArrayList();
            ArrayList whole = Lists.newArrayList();
            for (String column : conditionArray) {
                if (column.contains("%")) {
                    like.add(column.trim());
                    continue;
                }
                whole.add(column.trim());
            }
            Object likeWhere = "";
            if (like.size() > 0) {
                for (int i = 0; i < like.size(); ++i) {
                    likeWhere = i == like.size() - 1 ? (String)likeWhere + columnName + " like " + (String)like.get(i) : (String)likeWhere + columnName + " like " + (String)like.get(i) + " or ";
                }
            }
            String wholeWhere = columnName + " in (";
            if (whole.size() > 0) {
                for (int i = 0; i < whole.size(); ++i) {
                    wholeWhere = i == whole.size() - 1 ? wholeWhere + "'" + (String)whole.get(i) + "')" : wholeWhere + "'" + (String)whole.get(i) + "',";
                }
            }
            if (like.size() > 0 && whole.size() > 0) {
                hql = (String)hql + "(" + (String)likeWhere + " or " + wholeWhere + ")";
            } else if (like.size() > 0 && whole.size() == 0) {
                hql = (String)hql + "(" + (String)likeWhere + ")";
            } else if (like.size() == 0 && whole.size() > 0) {
                hql = (String)hql + "(" + wholeWhere + ")";
            }
        }
        return hql;
    }

    private String genUpdateHQLString(WorkSiteVo value, String jpql) {
        if (value.getArea() != null) {
            jpql = (String)jpql + "area = '" + value.getArea() + "',";
        }
        if (value.getColNum() != null) {
            jpql = (String)jpql + "colNum = '" + value.getColNum() + "',";
        }
        if (value.getContent() != null) {
            jpql = (String)jpql + "content = '" + value.getContent() + "',";
        }
        if (value.getDepth() != null) {
            jpql = (String)jpql + "depth = '" + value.getDepth() + "',";
        }
        if (value.getDisabled() != null) {
            jpql = (String)jpql + "disabled = " + (value.getDisabled() != false ? 1 : 0) + ",";
        }
        if (value.getFilled() != null) {
            jpql = (String)jpql + "filled = " + (value.getFilled() != false ? 1 : 0) + ",";
        }
        if (value.getGroupName() != null) {
            jpql = (String)jpql + "groupName = '" + value.getGroupName() + "',";
        }
        if (value.getLevel() != null) {
            jpql = (String)jpql + "level = '" + value.getLevel() + "',";
        }
        if (value.getLocked() != null) {
            jpql = (String)jpql + "locked = " + (value.getLocked() != false ? 1 : 0) + ",";
        }
        if (value.getLockedBy() != null) {
            jpql = (String)jpql + "lockedBy = '" + value.getLockedBy() + "',";
        }
        if (value.getNo() != null) {
            jpql = (String)jpql + "no = '" + value.getNo() + "',";
        }
        if (value.getPreparing() != null) {
            jpql = (String)jpql + "preparing = " + (value.getPreparing() != false ? 1 : 0) + ",";
        }
        if (value.getRowNum() != null) {
            jpql = (String)jpql + "rowNum = '" + value.getRowNum() + "',";
        }
        if (value.getSiteId() != null) {
            jpql = (String)jpql + "siteId = '" + value.getSiteId() + "',";
        }
        if (value.getSiteName() != null) {
            jpql = (String)jpql + "siteName = '" + value.getSiteName() + "',";
        }
        if (value.getTags() != null) {
            jpql = (String)jpql + "tags = '" + value.getTags() + "',";
        }
        if (value.getType() != null) {
            jpql = (String)jpql + "type = " + value.getType() + ",";
        }
        if (value.getWorking() != null) {
            jpql = (String)jpql + "working = " + (value.getWorking() != false ? 1 : 0) + ",";
        }
        if (value.getSyncFailed() != null) {
            jpql = (String)jpql + "syncFailed = " + (value.getSyncFailed() != false ? 1 : 0) + ",";
        }
        if (((String)jpql).endsWith(",")) {
            jpql = ((String)jpql).substring(0, ((String)jpql).length() - 1);
        }
        return jpql;
    }

    @Transactional(rollbackFor={Exception.class}, propagation=Propagation.REQUIRED)
    public int updateSitesByCondition(WorkSiteHqlCondition condition, WorkSiteVo value) {
        int updateNum = 0;
        Object jpql = "update WorkSite set ";
        if ("update WorkSite set ".equals(jpql = this.genUpdateHQLString(value, (String)jpql))) {
            return updateNum;
        }
        jpql = (String)jpql + " where 1 = 1";
        jpql = this.genAndWhereHQLString(condition, (String)jpql);
        Query query = this.em.createQuery((String)jpql);
        updateNum = query.executeUpdate();
        return updateNum;
    }

    public int updateUnlockSiteLockedBySiteId(String siteId, String lockedBy) {
        return this.workSiteMapper.updateUnlockSiteLockedBySiteId(siteId, lockedBy);
    }

    public List<WorkSite> getGroupSiteByStatus(List<String> asList, Integer filledStatus, Integer lockStatus) {
        return this.workSiteMapper.getGroupSiteByStatus(asList, filledStatus, lockStatus);
    }

    public List<WorkSite> getSiteListByGroup(String group) {
        return this.workSiteMapper.getSiteListByGroup(group);
    }

    public List<WorkSite> findByGroupName(String groupName) {
        return this.workSiteMapper.findSiteByGroupName(groupName);
    }

    public List<WorkSite> findWorkSiteListByCondition(List<String> groupNames, List<String> siteIds) {
        6 spec = new /* Unavailable Anonymous Inner Class!! */;
        List siteList = this.workSiteMapper.findAll((Specification)spec, Sort.by((Sort.Direction)Sort.Direction.fromString((String)"ASC"), (String[])new String[]{"siteId"}));
        return siteList;
    }

    public List<WorkSiteAttr> findAllExtFields() {
        return this.workSiteAttrMapper.findAllExtFields();
    }

    public List<WorkSiteAttrData> findAllExtFieldData() {
        return this.workSiteAttrDataMapper.findAll();
    }

    public List<WorkSiteBasicFieldVo> findAvailableSitesByExtFields(List<AttrVo> conditions) {
        List attrNameList = conditions.stream().map(AttrVo::getAttributeName).collect(Collectors.toList());
        ArrayList attrNameCopyList = new ArrayList(attrNameList);
        if (CollectionUtils.isEmpty(attrNameList)) {
            return null;
        }
        Map<String, String> nameValueMap = conditions.stream().collect(Collectors.toMap(AttrVo::getAttributeName, AttrVo::getAttributeValue, (oldValue, newValue) -> oldValue));
        List siteFields = Arrays.stream(WorkSite.class.getDeclaredFields()).map(Field::getName).collect(Collectors.toList());
        attrNameList.removeAll(siteFields);
        attrNameCopyList.retainAll(siteFields);
        String sql = this.genQuerySql(attrNameList, attrNameCopyList, nameValueMap);
        Query query = this.em.createQuery(sql);
        List rows = query.getResultList();
        return this.transToWorkSiteBasicFieldVo(rows);
    }

    private String genQuerySql(List<String> extFieldNames, List<String> siteFields, Map<String, String> nameValueMap) {
        int i;
        StringBuilder querySql = new StringBuilder("SELECT distinct w.siteId, w.siteName, w.locked, w.lockedBy, w.filled, w.content, w.area, w.tags, w.type, w.groupName FROM WorkSiteAttr a LEFT JOIN WorkSiteAttrData d ON a.id = d.attributeId LEFT JOIN WorkSite w ON d.siteId = w.siteId ");
        querySql.append(" WHERE w.disabled = 0 AND w.syncFailed = 0 ");
        if (!siteFields.isEmpty()) {
            querySql.append(" AND w.").append(siteFields.get(0)).append(" = '").append(nameValueMap.get(siteFields.get(0))).append("' ");
            for (i = 1; i < siteFields.size(); ++i) {
                querySql.append(" AND w.").append(siteFields.get(i)).append(" = '").append(nameValueMap.get(siteFields.get(i))).append("' ");
            }
        }
        if (!extFieldNames.isEmpty()) {
            querySql.append(" AND ((a.attributeName = '").append(extFieldNames.get(0)).append("' AND d.attributeValue like '").append(nameValueMap.get(extFieldNames.get(0))).append("') ");
            for (i = 1; i < extFieldNames.size(); ++i) {
                querySql.append(" OR (a.attributeName = '").append(extFieldNames.get(i)).append("' AND d.attributeValue like '").append(nameValueMap.get(extFieldNames.get(i))).append("') ");
            }
            querySql.append(")");
        }
        querySql.append(" order by w.siteId asc ");
        return querySql.toString();
    }

    private List<WorkSiteBasicFieldVo> transToWorkSiteBasicFieldVo(List rows) {
        ArrayList<WorkSiteBasicFieldVo> resultList = new ArrayList<WorkSiteBasicFieldVo>();
        for (Object row : rows) {
            Object[] cells = (Object[])row;
            WorkSiteBasicFieldVo resVo = new WorkSiteBasicFieldVo();
            resVo.setSiteId(cells[0] == null ? null : cells[0].toString());
            resVo.setSiteName(cells[1] == null ? null : cells[1].toString());
            resVo.setLocked(cells[2] == null ? null : Integer.valueOf((Integer)cells[2]));
            resVo.setLockedBy(cells[3] == null ? null : cells[3].toString());
            resVo.setFilled(cells[4] == null ? null : Integer.valueOf((Integer)cells[4]));
            resVo.setContent(cells[5] == null ? null : cells[5].toString());
            resVo.setArea(cells[6] == null ? null : cells[6].toString());
            resVo.setTags(cells[7] == null ? null : cells[7].toString());
            resVo.setFilled(cells[8] == null ? null : Integer.valueOf((Integer)cells[8]));
            resVo.setTags(cells[9] == null ? null : cells[9].toString());
            resultList.add(resVo);
        }
        return resultList;
    }

    public List<WorkSiteReqAndRespVo> getBasicResultList(List<WorkSiteAttr> extFieldList, List<WorkSite> siteList) {
        ArrayList<WorkSiteReqAndRespVo> resultList = new ArrayList<WorkSiteReqAndRespVo>();
        for (WorkSite site : siteList) {
            ArrayList<AttrVo> attrList = new ArrayList<AttrVo>();
            for (WorkSiteAttr attr : extFieldList) {
                AttrVo w = new AttrVo();
                w.setAttributeName(attr.getAttributeName());
                w.setAttributeValue("");
                attrList.add(w);
            }
            WorkSiteReqAndRespVo resultObj = WorkSiteReqAndRespVo.builder().id(site.getId()).siteId(site.getSiteId()).siteName(site.getSiteName()).working(site.getWorking()).locked(site.getLocked()).lockedBy(site.getLockedBy()).filled(site.getFilled()).disabled(site.getDisabled()).syncFailed(site.getSyncFailed()).content(site.getContent()).area(site.getArea()).rowNum(site.getRowNum()).colNum(site.getColNum()).level(site.getLevel()).depth(site.getDepth()).no(site.getNo()).agvId(site.getAgvId()).tags(site.getTags()).type(site.getType()).groupName(site.getGroupName()).attrList(attrList).build();
            resultList.add(resultObj);
        }
        return resultList;
    }

    public HashMap<String, List<AttrVo>> getAttrListMap(List<WorkSiteAttr> extFieldList, List<WorkSiteAttrData> extFieldData) {
        HashMap<String, List<AttrVo>> resMap = new HashMap<String, List<AttrVo>>();
        for (WorkSiteAttrData attrData : extFieldData) {
            List<Object> arrayList = null;
            arrayList = resMap.containsKey(attrData.getSiteId()) ? resMap.get(attrData.getSiteId()) : new ArrayList();
            for (WorkSiteAttr attr : extFieldList) {
                if (!StringUtils.equals((CharSequence)attrData.getAttributeId(), (CharSequence)attr.getId())) continue;
                AttrVo workSiteAttrVo = new AttrVo();
                workSiteAttrVo.setAttributeName(attr.getAttributeName());
                workSiteAttrVo.setAttributeValue(attrData.getAttributeValue());
                arrayList.add(workSiteAttrVo);
            }
            resMap.put(attrData.getSiteId(), arrayList);
        }
        return resMap;
    }

    public HashMap<String, List<AttrVo>> getCompleteAttrListJson(HashMap<String, List<AttrVo>> attrListMap, List<WorkSiteAttr> extFieldList) {
        HashMap<String, List<AttrVo>> resMap = new HashMap<String, List<AttrVo>>();
        Set<String> siteIds = attrListMap.keySet();
        for (String siteId : siteIds) {
            List<AttrVo> arrayList = attrListMap.get(siteId);
            ArrayList<String> attrNameListFromAttrListJson = new ArrayList<String>();
            for (AttrVo vo : arrayList) {
                String attrName = vo.getAttributeName();
                attrNameListFromAttrListJson.add(attrName);
            }
            List attrNameListFromTable = extFieldList.stream().map(attr -> attr.getAttributeName()).collect(Collectors.toList());
            attrNameListFromTable.removeAll(attrNameListFromAttrListJson);
            for (String attrName : attrNameListFromTable) {
                AttrVo w = new AttrVo();
                w.setAttributeName(attrName);
                w.setAttributeValue("");
                arrayList.add(w);
            }
            resMap.put(siteId, arrayList);
        }
        return resMap;
    }

    public List<WorkSiteReqAndRespVo> replaceAttrListField(List<WorkSiteReqAndRespVo> basicResultList, HashMap<String, List<AttrVo>> attrListMap) {
        for (int i = 0; i < basicResultList.size(); ++i) {
            WorkSiteReqAndRespVo siteObj = basicResultList.get(i);
            String siteId = siteObj.getSiteId();
            if (!attrListMap.containsKey(siteId)) continue;
            siteObj.setAttrList(attrListMap.get(siteId));
            basicResultList.set(i, siteObj);
        }
        return basicResultList;
    }

    public List<HashMap<String, String>> getAssembledList(List<WorkSiteAttr> extFieldList, List<WorkSiteAttrData> extFieldData) {
        ArrayList<HashMap<String, String>> assembledList = new ArrayList<HashMap<String, String>>();
        for (WorkSiteAttr attr : extFieldList) {
            for (WorkSiteAttrData attrData : extFieldData) {
                if (!attrData.getAttributeId().equals(attr.getId())) continue;
                HashMap<String, String> assembledMap = new HashMap<String, String>();
                assembledMap.put("attributeName", attr.getAttributeName());
                assembledMap.put("siteId", attrData.getSiteId());
                assembledMap.put("attributeValue", attrData.getAttributeValue());
                assembledList.add(assembledMap);
            }
        }
        return assembledList;
    }

    public List<HashMap<String, Object>> getAssembledDataList(List<WorkSite> workSiteList, List<WorkSiteAttr> extFieldList, List<WorkSiteAttrData> extFieldData) {
        ArrayList<HashMap<String, Object>> resultDataList = new ArrayList<HashMap<String, Object>>();
        List extFieldAssembledList = this.getAssembledList(extFieldList, extFieldData);
        for (WorkSite workSite : workSiteList) {
            HashMap worksiteExportMap = this.getBasicWorkSiteExportMap(workSite, extFieldList);
            for (HashMap extMap : extFieldAssembledList) {
                if (!workSite.getSiteId().equals(extMap.get("siteId"))) continue;
                worksiteExportMap.put((String)extMap.get("attributeName"), extMap.get("attributeValue"));
            }
            resultDataList.add(worksiteExportMap);
        }
        return resultDataList;
    }

    public List<ExcelExportEntity> getExcelExportEntityList(List<WorkSiteAttr> extFieldList) {
        ArrayList<ExcelExportEntity> excelExportEntityList = new ArrayList<ExcelExportEntity>();
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.tags.getCode()), (Object)"tags"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteId.getCode()), (Object)"siteId"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteName.getCode()), (Object)"siteName"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.working.getCode()), (Object)"working"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.locked.getCode()), (Object)"locked"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.preparing.getCode()), (Object)"preparing"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.filled.getCode()), (Object)"filled"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.disabled.getCode()), (Object)"disabled"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.content.getCode()), (Object)"content"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.groupName.getCode()), (Object)"groupName"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.rowNum.getCode()), (Object)"rowNum"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.colNum.getCode()), (Object)"colNum"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.level.getCode()), (Object)"level"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.depth.getCode()), (Object)"depth"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.no.getCode()), (Object)"no"));
        excelExportEntityList.add(new ExcelExportEntity(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.type.getCode()), (Object)"type"));
        for (WorkSiteAttr workSiteAttr : extFieldList) {
            excelExportEntityList.add(new ExcelExportEntity(workSiteAttr.getAttributeName(), (Object)workSiteAttr.getAttributeName()));
        }
        return excelExportEntityList;
    }

    private HashMap<String, Object> getBasicWorkSiteExportMap(WorkSite workSite, List<WorkSiteAttr> extFieldList) {
        HashMap<String, Object> basicWorkSiteExportMap = new HashMap<String, Object>();
        basicWorkSiteExportMap.put("tags", workSite.getTags());
        basicWorkSiteExportMap.put("siteName", workSite.getSiteName());
        basicWorkSiteExportMap.put("groupName", workSite.getGroupName());
        basicWorkSiteExportMap.put("content", workSite.getContent());
        basicWorkSiteExportMap.put("colNum", workSite.getColNum());
        basicWorkSiteExportMap.put("depth", workSite.getDepth());
        basicWorkSiteExportMap.put("disabled", workSite.getDisabled());
        basicWorkSiteExportMap.put("filled", workSite.getFilled());
        basicWorkSiteExportMap.put("level", workSite.getLevel());
        basicWorkSiteExportMap.put("no", workSite.getNo());
        basicWorkSiteExportMap.put("locked", workSite.getLocked());
        basicWorkSiteExportMap.put("preparing", workSite.getPreparing());
        basicWorkSiteExportMap.put("siteId", workSite.getSiteId());
        basicWorkSiteExportMap.put("rowNum", workSite.getRowNum());
        basicWorkSiteExportMap.put("working", workSite.getWorking());
        basicWorkSiteExportMap.put("type", workSite.getType());
        for (WorkSiteAttr workSiteAttr : extFieldList) {
            basicWorkSiteExportMap.put(workSiteAttr.getAttributeName(), null);
        }
        return basicWorkSiteExportMap;
    }

    public void saveWorkSiteFromMapList(List<Map> sites) throws RuntimeException {
        Map map = sites.get(0);
        Object o = map.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteId.getCode()));
        if (null == o) {
            throw new RuntimeException("Language mismatch");
        }
        List collect = sites.stream().filter(site -> site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.type.getCode())) == null || Integer.parseInt(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.type.getCode())).toString()) == 0).map(site -> {
            WorkSite workSite = WorkSite.builder().tags(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.tags.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.tags.getCode()))).siteId(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteId.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteId.getCode()))).siteName(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteName.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteName.getCode()))).working(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.working.getCode())) == null ? null : Integer.valueOf(Integer.parseInt((String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.working.getCode()))))).locked(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.locked.getCode())) == null ? null : Integer.valueOf(Integer.parseInt((String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.locked.getCode()))))).preparing(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.preparing.getCode())) == null ? null : Integer.valueOf(Integer.parseInt((String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.preparing.getCode()))))).filled(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.filled.getCode())) == null ? null : Integer.valueOf(Integer.parseInt((String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.filled.getCode()))))).disabled(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.disabled.getCode())) == null ? null : Integer.valueOf(Integer.parseInt((String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.disabled.getCode()))))).content(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.content.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.content.getCode()))).groupName(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.groupName.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.groupName.getCode()))).rowNum(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.rowNum.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.rowNum.getCode()))).colNum(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.colNum.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.colNum.getCode()))).level(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.level.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.level.getCode()))).depth(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.depth.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.depth.getCode()))).no(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.no.getCode())) == null ? null : (String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.no.getCode()))).type(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.type.getCode())) == null ? null : Integer.valueOf(Integer.parseInt((String)site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.type.getCode()))))).syncFailed(Integer.valueOf(0)).build();
            return workSite;
        }).collect(Collectors.toList());
        for (WorkSite site2 : collect) {
            WorkSite workSite = this.findBySiteId(site2.getSiteId());
            if (workSite != null) {
                site2.setId(workSite.getId());
            }
            this.workSiteMapper.save((Object)site2);
        }
    }

    public List<WorkSiteAttr> saveExtFieldsFromMapList(List<Map> sites) {
        ArrayList<WorkSiteAttr> attrList = new ArrayList<WorkSiteAttr>();
        WorkExcelTitleEnum[] values = WorkExcelTitleEnum.values();
        List basicImportFieldList = Arrays.stream(values).map(workExcelTitleEnum -> this.localeMessageUtil.getMessage(workExcelTitleEnum.getCode())).collect(Collectors.toList());
        Set allFieldSet = sites.get(0).keySet();
        ArrayList allFieldList = new ArrayList(allFieldSet);
        allFieldList.removeAll(basicImportFieldList);
        allFieldList.remove("excelRowNum");
        Map site = sites.get(0);
        for (String fieldName : allFieldList) {
            WorkSiteAttr attr = new WorkSiteAttr();
            String attrId = this.workSiteAttrMapper.findIdByName(fieldName);
            if (attrId != null) {
                attr.setId(attrId);
            }
            attr.setAttributeName(fieldName);
            attr.setCreateTime(Calendar.getInstance().getTime());
            attr.setIsDel(Integer.valueOf(0));
            WorkSiteAttr workSiteAttr = (WorkSiteAttr)this.workSiteAttrMapper.save((Object)attr);
            attrList.add(workSiteAttr);
        }
        return attrList;
    }

    private void saveExtFieldsAndDataFromMapList(List<Map> sites) {
        List extFieldList = this.saveExtFieldsFromMapList(sites);
        this.saveExtFieldDataFromMapList(sites, extFieldList);
    }

    public void saveExtFieldDataFromMapList(List<Map> sites, List<WorkSiteAttr> extFieldList) {
        ArrayList<WorkSiteAttrData> dataList = new ArrayList<WorkSiteAttrData>();
        for (Map site : sites) {
            for (WorkSiteAttr extField : extFieldList) {
                String attributeValue = site.get(extField.getAttributeName()) == null ? "" : site.get(extField.getAttributeName()).toString();
                if ("".equals(attributeValue)) continue;
                WorkSiteAttrData workSiteAttrData = WorkSiteAttrData.builder().attributeId(extField.getId()).attributeValue(attributeValue).createTime(Calendar.getInstance().getTime()).siteId(site.get(this.localeMessageUtil.getMessage(WorkExcelTitleEnum.siteId.getCode())).toString()).build();
                dataList.add(workSiteAttrData);
            }
        }
        for (WorkSiteAttrData attrData : dataList) {
            List workSiteAttrDataList = this.workSiteAttrDataMapper.findByAttributeIdAndSiteId(attrData.getAttributeId(), attrData.getSiteId());
            if (CollectionUtils.isNotEmpty((Collection)workSiteAttrDataList)) {
                attrData.setId(((WorkSiteAttrData)workSiteAttrDataList.get(0)).getId());
            }
            this.workSiteAttrDataMapper.save((Object)attrData);
        }
    }

    @Transactional
    public void saveOrUpdateWorkSite(WorkSiteReqAndRespVo req) {
        this.saveOrUpdateSite(req);
        this.saveOrUpdateAttrData(req);
    }

    @Transactional
    public void saveOrUpdateWorkSiteAttr(String siteId, AttrVo vo) {
        WorkSiteReqAndRespVo o = new WorkSiteReqAndRespVo();
        o.setSiteId(siteId);
        ArrayList<AttrVo> list = new ArrayList<AttrVo>();
        list.add(vo);
        o.setAttrList(list);
        this.saveOrUpdateAttrData(o);
    }

    private void saveOrUpdateSite(WorkSiteReqAndRespVo req) {
        WorkSite workSite = WorkSite.builder().siteName(req.getSiteName()).tags(req.getTags()).groupName(req.getGroupName()).content(req.getContent()).colNum(req.getColNum()).depth(req.getDepth()).disabled(req.getDisabled()).filled(req.getFilled()).level(req.getLevel()).no(req.getNo()).locked(req.getLocked()).lockedBy(req.getLockedBy()).area(req.getArea()).groupName(req.getGroupName()).siteId(req.getSiteId()).rowNum(req.getRowNum()).working(req.getWorking()).type(req.getType()).id(req.getId()).syncFailed(req.getSyncFailed()).build();
        this.workSiteMapper.save((Object)workSite);
    }

    private void saveOrUpdateAttrData(WorkSiteReqAndRespVo req) {
        String siteId = req.getSiteId();
        List attrList = req.getAttrList();
        if (attrList == null) {
            return;
        }
        for (AttrVo obj : attrList) {
            String attributeName = obj.getAttributeName();
            String attributeValue = obj.getAttributeValue();
            String attributeId = this.workSiteAttrMapper.findIdByName(attributeName);
            if (attributeId == null) continue;
            String id = null;
            List workSiteAttrDataList = this.workSiteAttrDataMapper.findByAttributeIdAndSiteId(attributeId, siteId);
            if (CollectionUtils.isNotEmpty((Collection)workSiteAttrDataList)) {
                id = ((WorkSiteAttrData)workSiteAttrDataList.get(0)).getId();
            }
            if (StringUtils.isEmpty(id) && StringUtils.isEmpty((CharSequence)attributeValue)) continue;
            WorkSiteAttrData workSiteAttrData = WorkSiteAttrData.builder().id(id).attributeId(attributeId).attributeValue(attributeValue).createTime(Calendar.getInstance().getTime()).siteId(siteId).build();
            this.workSiteAttrDataMapper.save((Object)workSiteAttrData);
        }
    }

    public void saveOrUpdateExtField(WorkSiteAttr workSiteAttr) {
        this.workSiteAttrMapper.save((Object)workSiteAttr);
    }

    public void lockedSitesBySiteIds(List<String> siteIdList, String lockedBy) {
        this.workSiteMapper.lockedSitesBySiteIds(lockedBy, siteIdList);
    }

    public void unLockedSitesBySiteIds(List<String> siteIdList) {
        this.workSiteMapper.unLockedSitesBySiteIds(siteIdList);
    }

    public List<WorkSite> findByConditionCrowdedSite(Integer type, List<String> groupNames) {
        7 spec = new /* Unavailable Anonymous Inner Class!! */;
        return this.workSiteMapper.findAll((Specification)spec);
    }

    @Transactional
    public void updateSiteExtFieldValueByIdAndExtFieldName(List<WorkSiteAttrDataUpdateVo> vos) {
        for (WorkSiteAttrDataUpdateVo vo : vos) {
            WorkSiteAttrData workSiteAttrData;
            List sites = this.workSiteMapper.findBySiteId(vo.getSiteId());
            String workSiteAttrId = this.workSiteAttrMapper.findIdByName(vo.getExtFieldName());
            if (StringUtils.isEmpty((CharSequence)workSiteAttrId) || CollectionUtils.isEmpty((Collection)sites)) continue;
            List workSiteAttrDataList = this.workSiteAttrDataMapper.findByAttributeIdAndSiteId(workSiteAttrId, vo.getSiteId());
            if (CollectionUtils.isNotEmpty((Collection)workSiteAttrDataList)) {
                workSiteAttrData = (WorkSiteAttrData)workSiteAttrDataList.get(0);
                workSiteAttrData.setAttributeValue(vo.getUpdateValue());
            } else {
                workSiteAttrData = WorkSiteAttrData.builder().attributeId(workSiteAttrId).siteId(vo.getSiteId()).attributeValue(vo.getUpdateValue()).build();
            }
            this.workSiteAttrDataMapper.save((Object)workSiteAttrData);
        }
    }

    @Transactional
    public void changeSiteHolder(String siteId, SiteStatusEnum holder) {
        List workSites = this.workSiteMapper.findBySiteId(siteId);
        if (CollectionUtils.isNotEmpty((Collection)workSites)) {
            WorkSite workSite = (WorkSite)workSites.get(0);
            workSite.setHolder(Integer.valueOf(holder.getStatus()));
            this.workSiteMapper.save((Object)workSite);
        }
    }

    @Transactional
    public void enableWorksiteByIds(List<String> workSiteIds) {
        List sites = this.workSiteMapper.findAllById(workSiteIds);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            sites.forEach(site -> site.setDisabled(Integer.valueOf(SiteStatusEnum.undisabled.getStatus())));
            this.workSiteMapper.saveAll((Iterable)sites);
        }
    }

    @Transactional
    public void disableWorksiteByIds(List<String> workSiteIds) {
        List sites = this.workSiteMapper.findAllById(workSiteIds);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            sites.forEach(site -> site.setDisabled(Integer.valueOf(SiteStatusEnum.disabled.getStatus())));
            this.workSiteMapper.saveAll((Iterable)sites);
        }
    }

    @Transactional
    public void clearSyncFailedByIds(List<String> workSiteIds) {
        List sites = this.workSiteMapper.findAllById(workSiteIds);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            sites.forEach(site -> site.setSyncFailed(Integer.valueOf(SiteStatusEnum.synnofailed.getStatus())));
            this.workSiteMapper.saveAll((Iterable)sites);
        }
    }

    @Transactional
    public void changeWorksiteFiledByIds(List<String> workSiteIds) {
        this.workSiteMapper.setSiteFillStatusBySiteIds(workSiteIds, Integer.valueOf(SiteStatusEnum.filled.getStatus()));
    }

    @Transactional
    public void changeWorksiteUnFiledByIds(List<String> workSiteIds) {
        this.workSiteMapper.setSiteFillStatusAndContentBySiteIds(workSiteIds, null, Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
    }

    @Transactional
    public void setWorksiteContentByIds(List<String> siteList, String content) {
        this.workSiteMapper.setSiteFillStatusAndContentBySiteIds(siteList, content, Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
    }

    @Transactional
    public void setWorksiteLabelByIds(List<String> siteList, String tags) {
        this.workSiteMapper.setSiteTagsBySiteId(siteList, tags);
    }

    @Transactional
    public void setWorksiteNumberByIds(List<String> siteList, String number) {
        this.workSiteMapper.setSiteNoBySiteId(siteList, number);
    }

    @Transactional
    public void setWorksiteNameByIds(List<String> siteList, String siteName) {
        this.workSiteMapper.setSiteNameBySiteId(siteList, siteName);
    }

    public Map<String, Set<String>> findAllSiteAreaAndGroup() {
        List siteList = this.workSiteMapper.findAll();
        Map<String, Set<String>> groupedByArea = siteList.stream().collect(Collectors.groupingBy(workSite -> Optional.ofNullable(workSite.getArea()).orElse(""), Collectors.mapping(workSite -> Optional.ofNullable(workSite.getGroupName()).orElse(""), Collectors.toSet())));
        return groupedByArea;
    }

    public List<WorkSite> findMonitorSiteList() {
        List siteList = this.workSiteMapper.findBriefSiteList();
        return siteList;
    }
}

