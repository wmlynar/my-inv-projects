/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.QueryIdleSiteBp
 *  com.seer.rds.vo.wind.GetIdleSiteBpField
 *  com.seer.rds.vo.wind.ParamPreField
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
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.GetIdleSiteBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="QueryIdleSiteBp")
@Scope(value="prototype")
public class QueryIdleSiteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(QueryIdleSiteBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteService workSiteService;
    private WorkSite site;
    private Object siteIdObj;
    private Object contentObj;
    private Object filledObj;
    private Object typeObj;
    private Object groupNameObj;
    private Object areaObj;
    private Object orderDescObj;
    private Object lockedObj;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.site = new WorkSite();
        this.siteIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.siteId);
        this.contentObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.content);
        this.filledObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.filled);
        this.typeObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.type);
        this.groupNameObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.groupName);
        this.lockedObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.locked);
        this.orderDescObj = rootBp.getInputParamValue(this.taskId, this.inputParams, GetIdleSiteBpField.orderDesc);
        this.site = this.workSiteService.findByCondition(this.siteIdObj != null ? this.siteIdObj.toString() : null, this.contentObj != null ? this.contentObj.toString() : null, this.filledObj != null ? Integer.valueOf(Boolean.parseBoolean(this.filledObj.toString()) ? SiteStatusEnum.filled.getStatus() : SiteStatusEnum.unfilled.getStatus()) : null, this.typeObj != null ? Integer.valueOf(Boolean.parseBoolean(this.typeObj.toString()) ? 1 : 0) : null, this.groupNameObj != null ? this.groupNameObj.toString() : null, this.lockedObj != null ? Boolean.parseBoolean(this.lockedObj.toString()) : false, this.orderDescObj != null ? Boolean.parseBoolean(this.orderDescObj.toString()) : false);
        if (this.site != null) {
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(GetIdleSiteBpField.site, this.site);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        } else {
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(GetIdleSiteBpField.site, "");
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        }
        this.saveLogResult((Object)(this.site == null ? "" : JSONObject.toJSONString((Object)this.site)));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        QueryIdleSiteBp bpData = new QueryIdleSiteBp();
        bpData.setContentObj(this.contentObj);
        bpData.setSiteIdObj(this.siteIdObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteService getWorkSiteService() {
        return this.workSiteService;
    }

    public WorkSite getSite() {
        return this.site;
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

    public Object getGroupNameObj() {
        return this.groupNameObj;
    }

    public Object getAreaObj() {
        return this.areaObj;
    }

    public Object getOrderDescObj() {
        return this.orderDescObj;
    }

    public Object getLockedObj() {
        return this.lockedObj;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteService(WorkSiteService workSiteService) {
        this.workSiteService = workSiteService;
    }

    public void setSite(WorkSite site) {
        this.site = site;
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

    public void setGroupNameObj(Object groupNameObj) {
        this.groupNameObj = groupNameObj;
    }

    public void setAreaObj(Object areaObj) {
        this.areaObj = areaObj;
    }

    public void setOrderDescObj(Object orderDescObj) {
        this.orderDescObj = orderDescObj;
    }

    public void setLockedObj(Object lockedObj) {
        this.lockedObj = lockedObj;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof QueryIdleSiteBp)) {
            return false;
        }
        QueryIdleSiteBp other = (QueryIdleSiteBp)o;
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
        WorkSite this$site = this.getSite();
        WorkSite other$site = other.getSite();
        if (this$site == null ? other$site != null : !this$site.equals(other$site)) {
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
        Object this$orderDescObj = this.getOrderDescObj();
        Object other$orderDescObj = other.getOrderDescObj();
        if (this$orderDescObj == null ? other$orderDescObj != null : !this$orderDescObj.equals(other$orderDescObj)) {
            return false;
        }
        Object this$lockedObj = this.getLockedObj();
        Object other$lockedObj = other.getLockedObj();
        return !(this$lockedObj == null ? other$lockedObj != null : !this$lockedObj.equals(other$lockedObj));
    }

    protected boolean canEqual(Object other) {
        return other instanceof QueryIdleSiteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WorkSiteService $workSiteService = this.getWorkSiteService();
        result = result * 59 + ($workSiteService == null ? 43 : $workSiteService.hashCode());
        WorkSite $site = this.getSite();
        result = result * 59 + ($site == null ? 43 : $site.hashCode());
        Object $siteIdObj = this.getSiteIdObj();
        result = result * 59 + ($siteIdObj == null ? 43 : $siteIdObj.hashCode());
        Object $contentObj = this.getContentObj();
        result = result * 59 + ($contentObj == null ? 43 : $contentObj.hashCode());
        Object $filledObj = this.getFilledObj();
        result = result * 59 + ($filledObj == null ? 43 : $filledObj.hashCode());
        Object $typeObj = this.getTypeObj();
        result = result * 59 + ($typeObj == null ? 43 : $typeObj.hashCode());
        Object $groupNameObj = this.getGroupNameObj();
        result = result * 59 + ($groupNameObj == null ? 43 : $groupNameObj.hashCode());
        Object $areaObj = this.getAreaObj();
        result = result * 59 + ($areaObj == null ? 43 : $areaObj.hashCode());
        Object $orderDescObj = this.getOrderDescObj();
        result = result * 59 + ($orderDescObj == null ? 43 : $orderDescObj.hashCode());
        Object $lockedObj = this.getLockedObj();
        result = result * 59 + ($lockedObj == null ? 43 : $lockedObj.hashCode());
        return result;
    }

    public String toString() {
        return "QueryIdleSiteBp(windService=" + this.getWindService() + ", workSiteService=" + this.getWorkSiteService() + ", site=" + this.getSite() + ", siteIdObj=" + this.getSiteIdObj() + ", contentObj=" + this.getContentObj() + ", filledObj=" + this.getFilledObj() + ", typeObj=" + this.getTypeObj() + ", groupNameObj=" + this.getGroupNameObj() + ", areaObj=" + this.getAreaObj() + ", orderDescObj=" + this.getOrderDescObj() + ", lockedObj=" + this.getLockedObj() + ")";
    }
}

