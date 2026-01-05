/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.GetIdleCrowdedSiteBp
 *  com.seer.rds.service.wind.taskBp.GetIdleSiteBp
 *  com.seer.rds.vo.wind.GetIdleSiteBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.service.wind.taskBp.GetIdleSiteBp;
import com.seer.rds.vo.wind.GetIdleSiteBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="GetIdleCrowdedSiteBp")
@Scope(value="prototype")
public class GetIdleCrowdedSiteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetIdleCrowdedSiteBp.class);
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    private Object filledObj;
    private Object groupNameObj;
    private Object lock;
    private Object retry;
    private Object content;
    private Object retryPeriodObj;
    private WorkSite site;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object s;
        int fill;
        this.filledObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.filled);
        this.groupNameObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.groupName);
        this.retryPeriodObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.retryPeriod);
        this.lock = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.lock);
        this.retry = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.retry);
        this.content = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.content);
        boolean retryFlag = this.retry != null ? Boolean.parseBoolean(this.retry.toString()) : true;
        Object numObj = this.blockInputParamsValue.get(GetIdleSiteBpField.retryNum);
        long num = numObj == null ? 0L : Long.valueOf(numObj.toString());
        log.info("GetIdleCrowdedSiteBp taskRecordId = {},filledObj={}, groupNameObj={},retryPeriodObj={},lock={},retry={}", new Object[]{this.taskRecord.getId(), this.filledObj, this.groupNameObj, this.retryPeriodObj, this.lock, this.retry});
        List groupNames = new ArrayList();
        int n = this.filledObj != null ? (Boolean.parseBoolean(this.filledObj.toString()) ? SiteStatusEnum.filled.getStatus() : SiteStatusEnum.unfilled.getStatus()) : (fill = 0);
        if (this.groupNameObj != null) {
            try {
                Object parse = JSON.parse((Object)this.groupNameObj);
                s = parse.toString();
                groupNames = JSONObject.parseArray((String)s, String.class);
            }
            catch (Exception e) {
                this.saveLogError("@{response.code.robotStatusSycException}");
                throw e;
            }
        }
        boolean taskStatus = true;
        while (taskStatus) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            s = GetIdleSiteBp.conLockKey;
            synchronized (s) {
                List sites = this.workSiteService.findByConditionCrowdedSite(Integer.valueOf(1), this.groupNameObj != null ? groupNames : null);
                List tmp = sites.stream().filter(it -> it.getSiteId().contains("_") && StringUtils.isNumeric((CharSequence)it.getSiteId().split("_")[it.getSiteId().split("_").length - 1])).collect(Collectors.toList());
                if (tmp.size() != sites.size()) {
                    throw new BpRuntimeException("@{wind.bp.crowdedSiteBp}");
                }
                if (CollectionUtils.isNotEmpty((Collection)sites)) {
                    block31: {
                        List collect = sites.stream().filter(workSite -> workSite.getFilled() == fill && this.content != null && StringUtils.equals((CharSequence)String.valueOf(this.content), (CharSequence)workSite.getContent()) && workSite.getLocked() == 0 && workSite.getDisabled() == 0 && workSite.getSyncFailed() == 0 && Integer.valueOf(workSite.getSiteId().split("_")[workSite.getSiteId().split("_").length - 1]) == 0).collect(Collectors.toList());
                        if (collect.isEmpty()) {
                            for (String name : groupNames) {
                                WorkSite workSite2;
                                int i;
                                collect = sites.stream().filter(workSite -> name.equals(workSite.getGroupName()) && Integer.valueOf(workSite.getSiteId().split("_")[workSite.getSiteId().split("_").length - 1]) != 0).sorted((o1, o2) -> Integer.valueOf(o1.getSiteId().split("_")[o1.getSiteId().split("_").length - 1]).compareTo(Integer.valueOf(o2.getSiteId().split("_")[o2.getSiteId().split("_").length - 1]))).collect(Collectors.toList());
                                if (fill == 1) {
                                    for (i = 0; i < collect.size(); ++i) {
                                        workSite2 = (WorkSite)collect.get(i);
                                        if (workSite2.getSyncFailed() == 1 || workSite2.getLocked() == 1 && !this.taskRecord.getId().equals(workSite2.getLockedBy()) || workSite2.getDisabled() == 1) {
                                            log.info("This group \u3010{}\u3011 cannot use because workSite cannot use {}", (Object)name, (Object)workSite2);
                                            break;
                                        }
                                        if (workSite2.getFilled() != 1) continue;
                                        if (this.content != null && StringUtils.isNotEmpty((CharSequence)this.content.toString()) && !StringUtils.equals((CharSequence)workSite2.getContent(), (CharSequence)String.valueOf(this.content))) {
                                            log.info("This group \u3010{}\u3011 cannot use because workSite content mismatch {}", (Object)name, (Object)workSite2);
                                            break;
                                        }
                                        this.site = workSite2;
                                        break block31;
                                    }
                                    log.info("This group \u3010{}\u3011 workSite unFilled", (Object)name);
                                    continue;
                                }
                                for (i = 0; i < collect.size(); ++i) {
                                    workSite2 = (WorkSite)collect.get(i);
                                    if (workSite2.getSyncFailed() == 1 || workSite2.getLocked() == 1 && !this.taskRecord.getId().equals(workSite2.getLockedBy()) || workSite2.getDisabled() == 1 || workSite2.getFilled() == 1) {
                                        log.info("This group \u3010{}\u3011 cannot use because workSite cannot use {}", (Object)name, (Object)workSite2);
                                        break;
                                    }
                                    if (workSite2.getFilled() != 0) continue;
                                    if (i + 1 >= collect.size()) {
                                        this.site = workSite2;
                                    } else {
                                        WorkSite nextSite = (WorkSite)collect.get(i + 1);
                                        if (nextSite.getLocked() == 1 && !this.taskRecord.getId().equals(nextSite.getLockedBy())) {
                                            log.info("This group \u3010{}\u3011 cannot use because nextSite locked {}", (Object)name, (Object)nextSite);
                                            break;
                                        }
                                        if (nextSite.getSyncFailed() != 1 && nextSite.getDisabled() != 1 && nextSite.getFilled() != 1) continue;
                                        log.info("This group \u3010{}\u3011 use because nextSite cannot use {}", (Object)name, (Object)nextSite);
                                        this.site = workSite2;
                                    }
                                    break block31;
                                }
                                log.info("This group \u3010{}\u3011 workSite filled", (Object)name);
                            }
                        } else {
                            this.site = (WorkSite)collect.get(0);
                        }
                    }
                    if (this.site != null) {
                        if (this.lock != null && Boolean.parseBoolean(this.lock.toString())) {
                            if (StringUtils.isEmpty((CharSequence)this.site.getLockedBy()) || this.site.getLockedBy().equals(this.taskRecord.getId())) {
                                int result = this.workSiteMapper.updateUnlockSiteLockedBySiteId(this.site.getSiteId(), this.taskRecord.getId());
                                if (result > 0) {
                                    Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                                    ConcurrentMap childParamMap = Maps.newConcurrentMap();
                                    childParamMap.put(GetIdleSiteBpField.siteId, this.site.getSiteId());
                                    paramMap.put(this.blockVo.getBlockName(), childParamMap);
                                    ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
                                    break;
                                }
                            } else {
                                this.saveLogSuspend(String.format("@{wind.bp.workMsg}%s@{wind.bp.workLock}", this.site.getLockedBy()));
                            }
                        } else if (StringUtils.isEmpty((CharSequence)this.site.getLockedBy()) || this.site.getLockedBy().equals(this.taskRecord.getId())) {
                            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                            ConcurrentMap childParamMap = Maps.newConcurrentMap();
                            childParamMap.put(GetIdleSiteBpField.siteId, this.site.getSiteId());
                            paramMap.put(this.blockVo.getBlockName(), childParamMap);
                            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
                            break;
                        }
                    }
                }
                if (!retryFlag) {
                    break;
                }
                if (num > 0L) {
                    if (num == 1L) {
                        this.saveLogInfo(String.format("@{wind.bp.retryOver}: %s", this.blockInputParamsValue.get(GetIdleSiteBpField.retryNum)));
                        break;
                    }
                    --num;
                }
                this.saveLogSuspend("@{wind.bp.getWork}...");
            }
            Thread.sleep(this.retryPeriodObj != null ? Long.parseLong(this.retryPeriodObj.toString()) : 1000L);
        }
        this.saveLogInfo("@{wind.bp.result}:" + (this.site == null ? "" : this.site.getSiteId()));
        log.info("taskRecord = {} get workSite = {}", (Object)this.taskRecord.getId(), (Object)this.site);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(GetIdleSiteBpField.siteId, this.site == null ? "" : this.site.getSiteId());
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setBlockInputParams(this.inputParams.toJSONString());
        HashMap hashMap = Maps.newHashMap();
        hashMap.put(GetIdleSiteBpField.filled, this.filledObj == null ? "" : this.filledObj);
        hashMap.put(GetIdleSiteBpField.groupName, this.groupNameObj == null ? "" : this.groupNameObj);
        hashMap.put(GetIdleSiteBpField.content, this.content == null ? "" : this.content);
        hashMap.put(GetIdleSiteBpField.lock, this.lock == null ? "" : this.lock);
        hashMap.put(GetIdleSiteBpField.retry, this.retry == null ? "" : this.retry);
        hashMap.put(GetIdleSiteBpField.retryPeriod, this.retryPeriodObj == null ? "" : this.retryPeriodObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)hashMap));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WorkSiteService getWorkSiteService() {
        return this.workSiteService;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public Object getFilledObj() {
        return this.filledObj;
    }

    public Object getGroupNameObj() {
        return this.groupNameObj;
    }

    public Object getLock() {
        return this.lock;
    }

    public Object getRetry() {
        return this.retry;
    }

    public Object getContent() {
        return this.content;
    }

    public Object getRetryPeriodObj() {
        return this.retryPeriodObj;
    }

    public WorkSite getSite() {
        return this.site;
    }

    public void setWorkSiteService(WorkSiteService workSiteService) {
        this.workSiteService = workSiteService;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setFilledObj(Object filledObj) {
        this.filledObj = filledObj;
    }

    public void setGroupNameObj(Object groupNameObj) {
        this.groupNameObj = groupNameObj;
    }

    public void setLock(Object lock) {
        this.lock = lock;
    }

    public void setRetry(Object retry) {
        this.retry = retry;
    }

    public void setContent(Object content) {
        this.content = content;
    }

    public void setRetryPeriodObj(Object retryPeriodObj) {
        this.retryPeriodObj = retryPeriodObj;
    }

    public void setSite(WorkSite site) {
        this.site = site;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GetIdleCrowdedSiteBp)) {
            return false;
        }
        GetIdleCrowdedSiteBp other = (GetIdleCrowdedSiteBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WorkSiteService this$workSiteService = this.getWorkSiteService();
        WorkSiteService other$workSiteService = other.getWorkSiteService();
        if (this$workSiteService == null ? other$workSiteService != null : !this$workSiteService.equals(other$workSiteService)) {
            return false;
        }
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        Object this$filledObj = this.getFilledObj();
        Object other$filledObj = other.getFilledObj();
        if (this$filledObj == null ? other$filledObj != null : !this$filledObj.equals(other$filledObj)) {
            return false;
        }
        Object this$groupNameObj = this.getGroupNameObj();
        Object other$groupNameObj = other.getGroupNameObj();
        if (this$groupNameObj == null ? other$groupNameObj != null : !this$groupNameObj.equals(other$groupNameObj)) {
            return false;
        }
        Object this$lock = this.getLock();
        Object other$lock = other.getLock();
        if (this$lock == null ? other$lock != null : !this$lock.equals(other$lock)) {
            return false;
        }
        Object this$retry = this.getRetry();
        Object other$retry = other.getRetry();
        if (this$retry == null ? other$retry != null : !this$retry.equals(other$retry)) {
            return false;
        }
        Object this$content = this.getContent();
        Object other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        Object this$retryPeriodObj = this.getRetryPeriodObj();
        Object other$retryPeriodObj = other.getRetryPeriodObj();
        if (this$retryPeriodObj == null ? other$retryPeriodObj != null : !this$retryPeriodObj.equals(other$retryPeriodObj)) {
            return false;
        }
        WorkSite this$site = this.getSite();
        WorkSite other$site = other.getSite();
        return !(this$site == null ? other$site != null : !this$site.equals(other$site));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GetIdleCrowdedSiteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WorkSiteService $workSiteService = this.getWorkSiteService();
        result = result * 59 + ($workSiteService == null ? 43 : $workSiteService.hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        Object $filledObj = this.getFilledObj();
        result = result * 59 + ($filledObj == null ? 43 : $filledObj.hashCode());
        Object $groupNameObj = this.getGroupNameObj();
        result = result * 59 + ($groupNameObj == null ? 43 : $groupNameObj.hashCode());
        Object $lock = this.getLock();
        result = result * 59 + ($lock == null ? 43 : $lock.hashCode());
        Object $retry = this.getRetry();
        result = result * 59 + ($retry == null ? 43 : $retry.hashCode());
        Object $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        Object $retryPeriodObj = this.getRetryPeriodObj();
        result = result * 59 + ($retryPeriodObj == null ? 43 : $retryPeriodObj.hashCode());
        WorkSite $site = this.getSite();
        result = result * 59 + ($site == null ? 43 : $site.hashCode());
        return result;
    }

    public String toString() {
        return "GetIdleCrowdedSiteBp(workSiteService=" + this.getWorkSiteService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", filledObj=" + this.getFilledObj() + ", groupNameObj=" + this.getGroupNameObj() + ", lock=" + this.getLock() + ", retry=" + this.getRetry() + ", content=" + this.getContent() + ", retryPeriodObj=" + this.getRetryPeriodObj() + ", site=" + this.getSite() + ")";
    }
}

