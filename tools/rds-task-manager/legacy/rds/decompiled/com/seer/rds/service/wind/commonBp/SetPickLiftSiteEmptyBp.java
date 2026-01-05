/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.dao.LiftRecordMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CallLiftBp
 *  com.seer.rds.service.wind.commonBp.SetPickLiftSiteEmptyBp
 *  com.seer.rds.vo.wind.SetSiteFilledBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.dao.LiftRecordMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.commonBp.CallLiftBp;
import com.seer.rds.vo.wind.SetSiteFilledBpField;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetPickLiftSiteEmptyBp")
@Scope(value="prototype")
@Deprecated
public class SetPickLiftSiteEmptyBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetPickLiftSiteEmptyBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private LiftRecordMapper liftRecordMapper;
    private Object siteId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteId = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteFilledBpField.siteId);
        String putSiteId = (String)CallLiftBp.siteMap.get(this.siteId.toString());
        log.info("SetPutLiftSiteFilledBp siteId=" + this.siteId);
        List allByPutSiteLabel = this.workSiteMapper.findBySiteId(this.siteId.toString());
        if (allByPutSiteLabel.size() == 0) {
            throw new Exception(String.format("@{wind.bp.siteNot}:%s", this.siteId));
        }
        List allByPickSiteLabel = this.workSiteMapper.findBySiteId(putSiteId.toString());
        if (allByPickSiteLabel.size() == 0) {
            throw new Exception(String.format("@{wind.bp.siteNot}:%s", putSiteId));
        }
        this.workSiteMapper.updateSiteFillStatusBySiteId(putSiteId, Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
        this.workSiteMapper.updateSiteFillStatusBySiteId(this.siteId.toString(), Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
        String taskRecordId = this.taskRecord.getId();
        this.workSiteMapper.updateLockedSiteToUnlockByLockedBy(this.siteId.toString(), taskRecordId);
        this.workSiteMapper.updateLockedSiteToUnlockByLockedBy(putSiteId, taskRecordId);
        this.liftRecordMapper.updateIsFinshedByTaskRecordId(taskRecordId);
        this.liftRecordMapper.updateIsFinshedByTaskRecordId((String)CallLiftBp.siteMap.get(this.siteId.toString() + "putTaskRecordId"));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public LiftRecordMapper getLiftRecordMapper() {
        return this.liftRecordMapper;
    }

    public Object getSiteId() {
        return this.siteId;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setLiftRecordMapper(LiftRecordMapper liftRecordMapper) {
        this.liftRecordMapper = liftRecordMapper;
    }

    public void setSiteId(Object siteId) {
        this.siteId = siteId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetPickLiftSiteEmptyBp)) {
            return false;
        }
        SetPickLiftSiteEmptyBp other = (SetPickLiftSiteEmptyBp)o;
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
        LiftRecordMapper this$liftRecordMapper = this.getLiftRecordMapper();
        LiftRecordMapper other$liftRecordMapper = other.getLiftRecordMapper();
        if (this$liftRecordMapper == null ? other$liftRecordMapper != null : !this$liftRecordMapper.equals(other$liftRecordMapper)) {
            return false;
        }
        Object this$siteId = this.getSiteId();
        Object other$siteId = other.getSiteId();
        return !(this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetPickLiftSiteEmptyBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        LiftRecordMapper $liftRecordMapper = this.getLiftRecordMapper();
        result = result * 59 + ($liftRecordMapper == null ? 43 : $liftRecordMapper.hashCode());
        Object $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        return result;
    }

    public String toString() {
        return "SetPickLiftSiteEmptyBp(windService=" + this.getWindService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", liftRecordMapper=" + this.getLiftRecordMapper() + ", siteId=" + this.getSiteId() + ")";
    }
}

