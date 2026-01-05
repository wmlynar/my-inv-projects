/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.SetSiteUnlockedBp
 *  com.seer.rds.vo.wind.SetSiteUnlockedBpField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.SetSiteUnlockedBpField;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetSiteUnlockedBp")
@Scope(value="prototype")
public class SetSiteUnlockedBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetSiteUnlockedBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    private Object siteIdObj;
    private String unLockedId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteUnlockedBpField.siteId);
        this.unLockedId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteUnlockedBpField.unLockedId);
        if (StringUtils.isEmpty((CharSequence)this.unLockedId)) {
            this.unLockedId = this.taskRecord.getId();
        }
        log.info("SetSiteUnlockedBp siteId=" + this.siteIdObj);
        String siteId = this.siteIdObj.toString();
        List allBySiteLabel = this.workSiteMapper.findBySiteId(siteId);
        if (allBySiteLabel.size() == 0) {
            throw new Exception(String.format("@{wind.bp.siteNot}:%s", this.siteIdObj));
        }
        WorkSite site = (WorkSite)allBySiteLabel.get(0);
        boolean hasLog = false;
        boolean unlock = false;
        while (site.getLocked() == 1 && !this.unLockedId.equals(site.getLockedBy()) && StringUtils.isNotEmpty((CharSequence)site.getLockedBy()) || !unlock) {
            int result;
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            if (site.getLocked() == 1 && !this.unLockedId.equals(site.getLockedBy()) && StringUtils.isNotEmpty((CharSequence)site.getLockedBy())) {
                this.saveLogSuspend(String.format("@{wind.bp.unlockWorkRetry}, %s@{wind.bp.workMsg}%s@{task.enum.lock}, @{wind.bp.siteUnlock}", siteId, site.getLockedBy()));
                if (!hasLog) {
                    log.info("SetSiteUnlockedBp siteId={}, lockedBy:{}", (Object)siteId, (Object)site.getLockedBy());
                    this.windService.saveSuspendErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn, "@{wind.bp.unlockWorkMsg},site id:" + siteId + ",site locked by:" + site.getLockedBy());
                }
                hasLog = true;
                Thread.sleep(3000L);
                if (!((Boolean)RootBp.taskStatus.get(this.taskId + this.taskRecord.getId())).booleanValue()) {
                    throw new RuntimeException("@{wind.bp.stopHand}");
                }
                allBySiteLabel = this.workSiteMapper.findBySiteId(siteId);
                site = (WorkSite)allBySiteLabel.get(0);
            } else if (site.getLocked() == 0) {
                this.saveLogSuspend(String.format("%s@{wind.bp.unlockedErrMsg}", siteId));
                Thread.sleep(3000L);
            }
            if (site.getLocked() == 1 && !this.unLockedId.equals(site.getLockedBy()) && StringUtils.isNotEmpty((CharSequence)site.getLockedBy()) || (result = this.workSiteMapper.updateLockedSiteToUnlockByLockedBy(site.getSiteId(), this.unLockedId).intValue()) <= 0) continue;
            unlock = true;
            site.setLocked(Integer.valueOf(SiteStatusEnum.unlock.getStatus()));
            site.setLockedBy("");
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        SetSiteUnlockedBp bpData = new SetSiteUnlockedBp();
        bpData.setSiteIdObj(this.siteIdObj);
        bpData.setUnLockedId(this.unLockedId);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
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

    public String getUnLockedId() {
        return this.unLockedId;
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

    public void setUnLockedId(String unLockedId) {
        this.unLockedId = unLockedId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetSiteUnlockedBp)) {
            return false;
        }
        SetSiteUnlockedBp other = (SetSiteUnlockedBp)o;
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
        String this$unLockedId = this.getUnLockedId();
        String other$unLockedId = other.getUnLockedId();
        return !(this$unLockedId == null ? other$unLockedId != null : !this$unLockedId.equals(other$unLockedId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetSiteUnlockedBp;
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
        String $unLockedId = this.getUnLockedId();
        result = result * 59 + ($unLockedId == null ? 43 : $unLockedId.hashCode());
        return result;
    }

    public String toString() {
        return "SetSiteUnlockedBp(windService=" + this.getWindService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", siteIdObj=" + this.getSiteIdObj() + ", unLockedId=" + this.getUnLockedId() + ")";
    }
}

