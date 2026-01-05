/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.worksite.SiteNode
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.GetIdleSiteBp
 *  com.seer.rds.vo.wind.GetIdleSiteBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.worksite.SiteNode;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.GetIdleSiteBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetIdleSiteBp")
@Scope(value="prototype")
public class GetIdleSiteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetIdleSiteBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteService workSiteService;
    private Object siteIdObj;
    private Object contentObj;
    private Object filledObj;
    private Object typeObj;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    private Object groupNameObj;
    private Object areaObj;
    private Object lockObj;
    public static final Object conLockKey = new Object();
    private Object retryPeriodObj;
    private Object orderDescObj;
    private Object lockedObj;
    private WorkSite site;
    private Object ifFairObj;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.siteId);
        this.contentObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.content);
        this.filledObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.filled);
        this.typeObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.type);
        this.groupNameObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.groupName);
        this.lockObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.lock);
        this.retryPeriodObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.retryPeriod);
        this.lockedObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.locked);
        this.ifFairObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.ifFair);
        this.orderDescObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.orderDesc);
        boolean ifFairBoolean = this.ifFairObj != null ? Boolean.parseBoolean(this.ifFairObj.toString()) : false;
        boolean taskStatus = true;
        boolean ifLog = true;
        int retryTimes = 0;
        int times = 0;
        Boolean ifHead = false;
        Integer branch = 0;
        Object groupName = "";
        Object siteParam = "";
        if (!this.interruptError.booleanValue() && ifFairBoolean) {
            Integer taskPriority;
            SiteNode siteNode;
            if (this.siteIdObj != null && this.lockObj != null && Boolean.parseBoolean(this.lockObj.toString())) {
                siteNode = new SiteNode();
                siteNode.setTaskRecord(this.taskRecord.getId());
                taskPriority = (Integer)RootBp.taskPriority.get(this.taskRecord.getId());
                if (taskPriority != null) {
                    siteNode.setPriority(taskPriority.intValue());
                }
                siteParam = this.siteIdObj + " content:" + (this.contentObj != null ? this.contentObj.toString() : "null") + " filled" + (this.filledObj != null ? Integer.valueOf(Boolean.parseBoolean(this.filledObj.toString()) ? SiteStatusEnum.filled.getStatus() : SiteStatusEnum.unfilled.getStatus()) : null);
                WindTaskService.siteNodeHashTable.add(siteNode, ((String)siteParam).toString());
                WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)siteParam).toString());
                branch = 1;
            } else if (this.groupNameObj != null && this.lockObj != null && Boolean.parseBoolean(this.lockObj.toString())) {
                siteNode = new SiteNode();
                siteNode.setTaskRecord(this.taskRecord.getId());
                taskPriority = (Integer)RootBp.taskPriority.get(this.taskRecord.getId());
                if (taskPriority != null) {
                    siteNode.setPriority(taskPriority.intValue());
                }
                groupName = this.groupNameObj.toString() + " content:" + (this.contentObj != null ? this.contentObj.toString() : "") + " filled" + (this.filledObj != null ? Integer.valueOf(Boolean.parseBoolean(this.filledObj.toString()) ? SiteStatusEnum.filled.getStatus() : SiteStatusEnum.unfilled.getStatus()) : null);
                WindTaskService.siteNodeHashTable.add(siteNode, (String)groupName);
                WindTaskService.siteNodeHashTable.showSiteLinkedList((String)groupName);
                branch = 2;
            }
        }
        try {
            while (taskStatus) {
                Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + this.taskRecord.getId()));
                taskStatus = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.running.getStatus();
                try {
                    WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                }
                catch (Exception e) {
                    if (ifFairBoolean && branch == 1) {
                        WindTaskService.siteNodeHashTable.delete((String)siteParam, this.taskRecord.getId());
                        WindTaskService.siteNodeHashTable.showSiteLinkedList((String)siteParam);
                    } else if (ifFairBoolean && branch == 2) {
                        WindTaskService.siteNodeHashTable.delete((String)groupName, this.taskRecord.getId());
                        WindTaskService.siteNodeHashTable.showSiteLinkedList((String)groupName);
                    }
                    log.info("taskStatus is not allowed to execute");
                    throw e;
                }
                ifHead = branch == 1 ? Boolean.valueOf(WindTaskService.siteNodeHashTable.findIfHead((String)siteParam, this.taskRecord.getId())) : (branch == 2 ? Boolean.valueOf(WindTaskService.siteNodeHashTable.findIfHead((String)groupName, this.taskRecord.getId())) : Boolean.valueOf(true));
                Object e = conLockKey;
                synchronized (e) {
                    block46: {
                        if (ifHead.booleanValue()) {
                            this.site = this.workSiteService.findByCondition(this.siteIdObj != null ? this.siteIdObj.toString() : null, this.contentObj != null ? this.contentObj.toString() : null, this.filledObj != null ? Integer.valueOf(Boolean.parseBoolean(this.filledObj.toString()) ? SiteStatusEnum.filled.getStatus() : SiteStatusEnum.unfilled.getStatus()) : null, this.typeObj != null ? Integer.valueOf(Boolean.parseBoolean(this.typeObj.toString()) ? 1 : 0) : null, this.groupNameObj != null ? this.groupNameObj.toString() : null, this.lockedObj != null ? Boolean.parseBoolean(this.lockedObj.toString()) : false, this.orderDescObj != null ? Boolean.parseBoolean(this.orderDescObj.toString()) : false);
                        } else {
                            while (ifLog) {
                                if (branch == 1) {
                                    this.saveLogSuspend(String.format("%s:@{wind.bp.waitLockBySite}", this.siteIdObj));
                                } else if (branch == 2) {
                                    this.saveLogSuspend(String.format("%s:@{wind.bp.waitLockByGroup}", this.groupNameObj));
                                }
                                ifLog = false;
                            }
                        }
                        if (this.site != null) {
                            try {
                                if (this.lockObj != null && Boolean.parseBoolean(this.lockObj.toString())) {
                                    if (StringUtils.isEmpty((CharSequence)this.site.getLockedBy()) || this.site.getLockedBy().equals(this.taskRecord.getId())) {
                                        log.info("\u51c6\u5907\u52a0\u9501\uff1a" + this.taskRecord.getId());
                                        int resultValue = this.workSiteMapper.updateUnlockSiteLockedBySiteId(this.site.getSiteId(), this.taskRecord.getId());
                                        if (resultValue <= 0) break block46;
                                        this.judgeBranchAndSaveCache(rootBp, branch, (String)groupName, (String)siteParam, this.taskRecord);
                                        break;
                                    }
                                    if (times == 0 || times == 5) {
                                        if (times == 5) {
                                            times = 0;
                                        }
                                        log.info("wait lock");
                                        log.info("\u5f53\u524d\u4efb\u52a1\u5b9e\u4f8bid\u4e3a\uff1a" + this.taskRecord.getId());
                                        if (branch == 1) {
                                            WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)siteParam).toString());
                                        } else if (branch == 2) {
                                            WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)groupName).toString());
                                        }
                                    }
                                    ++times;
                                    this.saveLogSuspend(String.format("@{wind.bp.workMsg}%s:@{wind.bp.workLock}", this.site.getLockedBy()));
                                    break block46;
                                }
                                if (StringUtils.isEmpty((CharSequence)this.site.getLockedBy()) || this.site.getLockedBy().equals(this.taskRecord.getId())) {
                                    this.judgeBranchAndSaveCache(rootBp, branch, (String)groupName, (String)siteParam, this.taskRecord);
                                    break;
                                }
                                if (this.lockObj != null && Boolean.parseBoolean(this.lockObj.toString())) break block46;
                                Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                                ConcurrentMap childParamMap = Maps.newConcurrentMap();
                                childParamMap.put(GetIdleSiteBpField.siteId, this.site.getSiteId());
                                paramMap.put(this.blockVo.getBlockName(), childParamMap);
                                ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
                                break;
                            }
                            catch (Exception e2) {
                                if (this.lockObj != null) {
                                    if (branch == 1) {
                                        WindTaskService.siteNodeHashTable.delete(((String)siteParam).toString(), this.taskRecord.getId());
                                        WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)siteParam).toString());
                                    } else if (branch == 2) {
                                        WindTaskService.siteNodeHashTable.delete(((String)groupName).toString(), this.taskRecord.getId());
                                        WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)groupName).toString());
                                    }
                                }
                                throw e2;
                            }
                        }
                        if (times == 0 || times == 5) {
                            if (times == 5) {
                                times = 0;
                            }
                            log.info("wait lock");
                            log.info("\u5f53\u524d\u4efb\u52a1\u5b9e\u4f8bid\u4e3a\uff1a" + this.taskRecord.getId());
                            if (branch == 1) {
                                WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)siteParam).toString());
                            } else if (branch == 2) {
                                WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)groupName).toString());
                            }
                        }
                        ++times;
                    }
                }
                ++retryTimes;
                this.saveLogSuspend("@{wind.bp.getWork}...");
                long retryPeriodTime = this.retryPeriodObj != null ? Long.parseLong(this.retryPeriodObj.toString()) : 1000L;
                Thread.sleep(retryPeriodTime);
            }
        }
        catch (Exception e) {
            log.error("GetIdleSiteBp Exception", (Throwable)e);
            if (branch == 1) {
                WindTaskService.siteNodeHashTable.delete(((String)siteParam).toString(), this.taskRecord.getId());
                WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)siteParam).toString());
            } else if (branch == 2) {
                WindTaskService.siteNodeHashTable.delete(((String)groupName).toString(), this.taskRecord.getId());
                WindTaskService.siteNodeHashTable.showSiteLinkedList(((String)groupName).toString());
            }
            throw e;
        }
        this.saveLogResult((Object)this.site.getSiteId());
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(GetIdleSiteBpField.siteId, this.site.getSiteId());
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    private void judgeBranchAndSaveCache(AbstratRootBp rootBp, Integer branch, String groupName, String siteParam, BaseRecord taskRecord) {
        Boolean redo = false;
        if (taskRecord.getId().equals(this.site.getLockedBy())) {
            redo = true;
        }
        if (branch == 1) {
            WindTaskService.siteNodeHashTable.delete(siteParam.toString(), taskRecord.getId());
            WindTaskService.siteNodeHashTable.showSiteLinkedList(siteParam.toString());
            if (redo.booleanValue()) {
                WindTaskService.siteNodeHashTable.delete(siteParam.toString(), taskRecord.getId());
            }
        } else if (branch == 2) {
            WindTaskService.siteNodeHashTable.delete(groupName.toString(), taskRecord.getId());
            WindTaskService.siteNodeHashTable.showSiteLinkedList(groupName.toString());
            if (redo.booleanValue()) {
                WindTaskService.siteNodeHashTable.delete(groupName.toString(), taskRecord.getId());
            }
        }
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(GetIdleSiteBpField.siteId, this.site.getSiteId());
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setBlockInputParams(this.inputParams.toJSONString());
        GetIdleSiteBp bpData = new GetIdleSiteBp();
        bpData.setContentObj(this.contentObj);
        bpData.setSiteIdObj(this.siteIdObj);
        bpData.setFilledObj(this.filledObj);
        bpData.setTypeObj(this.typeObj);
        bpData.setGroupNameObj(this.groupNameObj);
        bpData.setLockedObj(this.lockedObj);
        bpData.setLockObj(this.lockObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteService getWorkSiteService() {
        return this.workSiteService;
    }

    public Object getSiteIdObj() {
        return this.siteIdObj;
    }

    public Object getContentObj() {
        return this.contentObj;
    }

    public Object getFilledObj() {
        return this.filledObj;
    }

    public Object getTypeObj() {
        return this.typeObj;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public Object getGroupNameObj() {
        return this.groupNameObj;
    }

    public Object getAreaObj() {
        return this.areaObj;
    }

    public Object getLockObj() {
        return this.lockObj;
    }

    public Object getRetryPeriodObj() {
        return this.retryPeriodObj;
    }

    public Object getOrderDescObj() {
        return this.orderDescObj;
    }

    public Object getLockedObj() {
        return this.lockedObj;
    }

    public WorkSite getSite() {
        return this.site;
    }

    public Object getIfFairObj() {
        return this.ifFairObj;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteService(WorkSiteService workSiteService) {
        this.workSiteService = workSiteService;
    }

    public void setSiteIdObj(Object siteIdObj) {
        this.siteIdObj = siteIdObj;
    }

    public void setContentObj(Object contentObj) {
        this.contentObj = contentObj;
    }

    public void setFilledObj(Object filledObj) {
        this.filledObj = filledObj;
    }

    public void setTypeObj(Object typeObj) {
        this.typeObj = typeObj;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setGroupNameObj(Object groupNameObj) {
        this.groupNameObj = groupNameObj;
    }

    public void setAreaObj(Object areaObj) {
        this.areaObj = areaObj;
    }

    public void setLockObj(Object lockObj) {
        this.lockObj = lockObj;
    }

    public void setRetryPeriodObj(Object retryPeriodObj) {
        this.retryPeriodObj = retryPeriodObj;
    }

    public void setOrderDescObj(Object orderDescObj) {
        this.orderDescObj = orderDescObj;
    }

    public void setLockedObj(Object lockedObj) {
        this.lockedObj = lockedObj;
    }

    public void setSite(WorkSite site) {
        this.site = site;
    }

    public void setIfFairObj(Object ifFairObj) {
        this.ifFairObj = ifFairObj;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GetIdleSiteBp)) {
            return false;
        }
        GetIdleSiteBp other = (GetIdleSiteBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WorkSiteService this$workSiteService = this.getWorkSiteService();
        WorkSiteService other$workSiteService = other.getWorkSiteService();
        if (this$workSiteService == null ? other$workSiteService != null : !this$workSiteService.equals(other$workSiteService)) {
            return false;
        }
        Object this$siteIdObj = this.getSiteIdObj();
        Object other$siteIdObj = other.getSiteIdObj();
        if (this$siteIdObj == null ? other$siteIdObj != null : !this$siteIdObj.equals(other$siteIdObj)) {
            return false;
        }
        Object this$contentObj = this.getContentObj();
        Object other$contentObj = other.getContentObj();
        if (this$contentObj == null ? other$contentObj != null : !this$contentObj.equals(other$contentObj)) {
            return false;
        }
        Object this$filledObj = this.getFilledObj();
        Object other$filledObj = other.getFilledObj();
        if (this$filledObj == null ? other$filledObj != null : !this$filledObj.equals(other$filledObj)) {
            return false;
        }
        Object this$typeObj = this.getTypeObj();
        Object other$typeObj = other.getTypeObj();
        if (this$typeObj == null ? other$typeObj != null : !this$typeObj.equals(other$typeObj)) {
            return false;
        }
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        Object this$groupNameObj = this.getGroupNameObj();
        Object other$groupNameObj = other.getGroupNameObj();
        if (this$groupNameObj == null ? other$groupNameObj != null : !this$groupNameObj.equals(other$groupNameObj)) {
            return false;
        }
        Object this$areaObj = this.getAreaObj();
        Object other$areaObj = other.getAreaObj();
        if (this$areaObj == null ? other$areaObj != null : !this$areaObj.equals(other$areaObj)) {
            return false;
        }
        Object this$lockObj = this.getLockObj();
        Object other$lockObj = other.getLockObj();
        if (this$lockObj == null ? other$lockObj != null : !this$lockObj.equals(other$lockObj)) {
            return false;
        }
        Object this$retryPeriodObj = this.getRetryPeriodObj();
        Object other$retryPeriodObj = other.getRetryPeriodObj();
        if (this$retryPeriodObj == null ? other$retryPeriodObj != null : !this$retryPeriodObj.equals(other$retryPeriodObj)) {
            return false;
        }
        Object this$orderDescObj = this.getOrderDescObj();
        Object other$orderDescObj = other.getOrderDescObj();
        if (this$orderDescObj == null ? other$orderDescObj != null : !this$orderDescObj.equals(other$orderDescObj)) {
            return false;
        }
        Object this$lockedObj = this.getLockedObj();
        Object other$lockedObj = other.getLockedObj();
        if (this$lockedObj == null ? other$lockedObj != null : !this$lockedObj.equals(other$lockedObj)) {
            return false;
        }
        WorkSite this$site = this.getSite();
        WorkSite other$site = other.getSite();
        if (this$site == null ? other$site != null : !this$site.equals(other$site)) {
            return false;
        }
        Object this$ifFairObj = this.getIfFairObj();
        Object other$ifFairObj = other.getIfFairObj();
        return !(this$ifFairObj == null ? other$ifFairObj != null : !this$ifFairObj.equals(other$ifFairObj));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GetIdleSiteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WorkSiteService $workSiteService = this.getWorkSiteService();
        result = result * 59 + ($workSiteService == null ? 43 : $workSiteService.hashCode());
        Object $siteIdObj = this.getSiteIdObj();
        result = result * 59 + ($siteIdObj == null ? 43 : $siteIdObj.hashCode());
        Object $contentObj = this.getContentObj();
        result = result * 59 + ($contentObj == null ? 43 : $contentObj.hashCode());
        Object $filledObj = this.getFilledObj();
        result = result * 59 + ($filledObj == null ? 43 : $filledObj.hashCode());
        Object $typeObj = this.getTypeObj();
        result = result * 59 + ($typeObj == null ? 43 : $typeObj.hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        Object $groupNameObj = this.getGroupNameObj();
        result = result * 59 + ($groupNameObj == null ? 43 : $groupNameObj.hashCode());
        Object $areaObj = this.getAreaObj();
        result = result * 59 + ($areaObj == null ? 43 : $areaObj.hashCode());
        Object $lockObj = this.getLockObj();
        result = result * 59 + ($lockObj == null ? 43 : $lockObj.hashCode());
        Object $retryPeriodObj = this.getRetryPeriodObj();
        result = result * 59 + ($retryPeriodObj == null ? 43 : $retryPeriodObj.hashCode());
        Object $orderDescObj = this.getOrderDescObj();
        result = result * 59 + ($orderDescObj == null ? 43 : $orderDescObj.hashCode());
        Object $lockedObj = this.getLockedObj();
        result = result * 59 + ($lockedObj == null ? 43 : $lockedObj.hashCode());
        WorkSite $site = this.getSite();
        result = result * 59 + ($site == null ? 43 : $site.hashCode());
        Object $ifFairObj = this.getIfFairObj();
        result = result * 59 + ($ifFairObj == null ? 43 : $ifFairObj.hashCode());
        return result;
    }

    public String toString() {
        return "GetIdleSiteBp(windService=" + this.getWindService() + ", workSiteService=" + this.getWorkSiteService() + ", siteIdObj=" + this.getSiteIdObj() + ", contentObj=" + this.getContentObj() + ", filledObj=" + this.getFilledObj() + ", typeObj=" + this.getTypeObj() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", groupNameObj=" + this.getGroupNameObj() + ", areaObj=" + this.getAreaObj() + ", lockObj=" + this.getLockObj() + ", retryPeriodObj=" + this.getRetryPeriodObj() + ", orderDescObj=" + this.getOrderDescObj() + ", lockedObj=" + this.getLockedObj() + ", site=" + this.getSite() + ", ifFairObj=" + this.getIfFairObj() + ")";
    }
}

