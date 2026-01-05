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
 *  com.seer.rds.service.wind.commonBp.SetSiteEmptyBp
 *  com.seer.rds.vo.wind.SetSiteEmptyBpField
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
import com.seer.rds.vo.wind.SetSiteEmptyBpField;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetSiteEmptyBp")
@Scope(value="prototype")
public class SetSiteEmptyBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetSiteEmptyBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    private Object siteIdObj;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteEmptyBpField.siteId);
        log.info("setSiteEmpty siteId={}", this.siteIdObj);
        List allBySiteLabel = this.workSiteMapper.findBySiteId(this.siteIdObj.toString());
        if (allBySiteLabel.size() == 0) {
            throw new Exception(String.format("@{wind.bp.siteNot}:%s", this.siteIdObj));
        }
        WorkSite site = (WorkSite)allBySiteLabel.get(0);
        site.setFilled(Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
        site.setContent("");
        this.workSiteMapper.save((Object)site);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        SetSiteEmptyBp bpData = new SetSiteEmptyBp();
        bpData.setSiteIdObj(this.siteIdObj);
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

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setSiteIdObj(Object siteIdObj) {
        this.siteIdObj = siteIdObj;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetSiteEmptyBp)) {
            return false;
        }
        SetSiteEmptyBp other = (SetSiteEmptyBp)o;
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
        return !(this$siteIdObj == null ? other$siteIdObj != null : !this$siteIdObj.equals(other$siteIdObj));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetSiteEmptyBp;
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
        return result;
    }

    public String toString() {
        return "SetSiteEmptyBp(windService=" + this.getWindService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", siteIdObj=" + this.getSiteIdObj() + ")";
    }
}

