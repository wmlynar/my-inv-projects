/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.worksite.SiteNode
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.SetSiteLockedBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.SetSiteLockedBpField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.worksite.SiteNode;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.SetSiteLockedBpField;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetSiteLockedBp")
@Scope(value="prototype")
public class SetSiteLockedBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetSiteLockedBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    private Object siteIdObj;
    private Object ifFairObj;
    private String lockedId;
    private Object retryTimes;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteLockedBpField.siteId);
        this.ifFairObj = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteLockedBpField.ifFair);
        this.lockedId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteLockedBpField.lockedId);
        boolean ifFairBoolean = this.ifFairObj != null ? Boolean.parseBoolean(this.ifFairObj.toString()) : false;
        this.retryTimes = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteLockedBpField.retryTimes);
        if (StringUtils.isEmpty((CharSequence)this.lockedId)) {
            this.lockedId = this.taskRecord.getId();
        }
        boolean ifLog = true;
        log.info("SetSiteLockedBp siteId={}", this.siteIdObj);
        List allBySiteLabel = this.workSiteMapper.findBySiteId(this.siteIdObj.toString());
        if (allBySiteLabel.size() == 0) {
            throw new Exception(String.format("@{wind.bp.siteNot}:%s", this.siteIdObj));
        }
        WorkSite site = (WorkSite)allBySiteLabel.get(0);
        String siteId = site.getSiteId();
        boolean hasLog = false;
        boolean locked = false;
        if (!this.interruptError.booleanValue() && ifFairBoolean) {
            SiteNode siteNode = new SiteNode();
            siteNode.setTaskRecord(this.lockedId);
            Integer taskPriority = (Integer)RootBp.taskPriority.get(this.lockedId);
            if (taskPriority != null) {
                siteNode.setPriority(taskPriority.intValue());
            } else {
                siteNode.setPriority(1);
            }
            WindTaskService.siteNodeHashTable.add(siteNode, siteId);
        }
        try {
            int runTimes = 0;
            int times = 0;
            while (site.getLocked() == 1 && !this.lockedId.equals(site.getLockedBy()) || !locked) {
                try {
                    WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                }
                catch (Exception e) {
                    if (ifFairBoolean) {
                        WindTaskService.siteNodeHashTable.delete(site.getSiteId(), this.lockedId);
                    }
                    throw e;
                }
                if (!ifFairBoolean || WindTaskService.siteNodeHashTable.findIfHead(siteId, this.lockedId)) {
                    if (site.getLocked() == 1 && !this.lockedId.equals(site.getLockedBy())) {
                        this.saveLogSuspend(String.format("@{wind.bp.lockWorkRetry}, %s@{wind.bp.workMsg}%s:@{wind.bp.workLock}", siteId, site.getLockedBy()));
                        if (!hasLog) {
                            this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "@{wind.bp.lockWorkMsg}...");
                        }
                        hasLog = true;
                        Thread.sleep(2000L);
                        if (!((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue()) {
                            throw new RuntimeException("@{wind.bp.stopHand}");
                        }
                        allBySiteLabel = this.workSiteMapper.findBySiteId(this.siteIdObj.toString());
                        site = (WorkSite)allBySiteLabel.get(0);
                    }
                    if (site.getLocked() != 1 || this.lockedId.equals(site.getLockedBy())) {
                        if (site.getLocked() == 1 && this.lockedId.equals(site.getLockedBy())) {
                            WindTaskService.siteNodeHashTable.delete(siteId, this.lockedId);
                            locked = true;
                            break;
                        }
                        int result = this.workSiteMapper.updateUnlockSiteLockedBySiteId(site.getSiteId(), this.lockedId);
                        if (result > 0) {
                            if (ifFairBoolean) {
                                log.info("ready lock lockedId={}", (Object)this.lockedId);
                                WindTaskService.siteNodeHashTable.delete(siteId, this.lockedId);
                                WindTaskService.siteNodeHashTable.showSiteLinkedList(siteId);
                            }
                            locked = true;
                            site.setLocked(Integer.valueOf(SiteStatusEnum.lock.getStatus()));
                            site.setLockedBy(this.lockedId);
                        }
                    }
                } else {
                    this.saveLogSuspend(String.format("%s:@{wind.bp.waitLockBySite}", site.getSiteId()));
                    if (times == 0 || times == 5) {
                        if (times == 5) {
                            times = 0;
                        }
                        log.info("wait lock");
                        if (ifFairBoolean) {
                            log.info("\u5f53\u524d\u4efb\u52a1\u5b9e\u4f8bid\u4e3a\uff1a{}", (Object)this.taskRecord.getId());
                            WindTaskService.siteNodeHashTable.showSiteLinkedList(siteId);
                        }
                    }
                    ++times;
                    Thread.sleep(2000L);
                }
                if (null == this.retryTimes || ++runTimes < Integer.parseInt(this.retryTimes.toString())) continue;
                if (ifFairBoolean) {
                    WindTaskService.siteNodeHashTable.delete(site.getSiteId(), this.lockedId);
                }
                break;
            }
        }
        catch (Exception e) {
            WindTaskService.siteNodeHashTable.delete(siteId, this.lockedId);
            throw e;
        }
        this.setOutPutParam(rootBp, locked);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        SetSiteLockedBp bpData = new SetSiteLockedBp();
        bpData.setSiteIdObj(this.siteIdObj);
        bpData.setIfFairObj(this.ifFairObj);
        bpData.setLockedId(this.lockedId);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected void setOutPutParam(AbstratRootBp rootBp, boolean value) {
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put("success", value);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public Object getSiteIdObj() {
        return this.siteIdObj;
    }

    public Object getIfFairObj() {
        return this.ifFairObj;
    }

    public String getLockedId() {
        return this.lockedId;
    }

    public Object getRetryTimes() {
        return this.retryTimes;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setSiteIdObj(Object siteIdObj) {
        this.siteIdObj = siteIdObj;
    }

    public void setIfFairObj(Object ifFairObj) {
        this.ifFairObj = ifFairObj;
    }

    public void setLockedId(String lockedId) {
        this.lockedId = lockedId;
    }

    public void setRetryTimes(Object retryTimes) {
        this.retryTimes = retryTimes;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetSiteLockedBp)) {
            return false;
        }
        SetSiteLockedBp other = (SetSiteLockedBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        Object this$siteIdObj = this.getSiteIdObj();
        Object other$siteIdObj = other.getSiteIdObj();
        if (this$siteIdObj == null ? other$siteIdObj != null : !this$siteIdObj.equals(other$siteIdObj)) {
            return false;
        }
        Object this$ifFairObj = this.getIfFairObj();
        Object other$ifFairObj = other.getIfFairObj();
        if (this$ifFairObj == null ? other$ifFairObj != null : !this$ifFairObj.equals(other$ifFairObj)) {
            return false;
        }
        String this$lockedId = this.getLockedId();
        String other$lockedId = other.getLockedId();
        if (this$lockedId == null ? other$lockedId != null : !this$lockedId.equals(other$lockedId)) {
            return false;
        }
        Object this$retryTimes = this.getRetryTimes();
        Object other$retryTimes = other.getRetryTimes();
        return !(this$retryTimes == null ? other$retryTimes != null : !this$retryTimes.equals(other$retryTimes));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetSiteLockedBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        Object $siteIdObj = this.getSiteIdObj();
        result = result * 59 + ($siteIdObj == null ? 43 : $siteIdObj.hashCode());
        Object $ifFairObj = this.getIfFairObj();
        result = result * 59 + ($ifFairObj == null ? 43 : $ifFairObj.hashCode());
        String $lockedId = this.getLockedId();
        result = result * 59 + ($lockedId == null ? 43 : $lockedId.hashCode());
        Object $retryTimes = this.getRetryTimes();
        result = result * 59 + ($retryTimes == null ? 43 : $retryTimes.hashCode());
        return result;
    }

    public String toString() {
        return "SetSiteLockedBp(windService=" + this.getWindService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", siteIdObj=" + this.getSiteIdObj() + ", ifFairObj=" + this.getIfFairObj() + ", lockedId=" + this.getLockedId() + ", retryTimes=" + this.getRetryTimes() + ")";
    }
}

