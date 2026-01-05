/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.BatchSettingSiteBp
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  com.seer.rds.vo.WorkSiteVo
 *  com.seer.rds.vo.wind.BatchSettingSiteBpField
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.WorkSiteHqlCondition;
import com.seer.rds.vo.WorkSiteVo;
import com.seer.rds.vo.wind.BatchSettingSiteBpField;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="BatchSettingSiteBp")
@Scope(value="prototype")
public class BatchSettingSiteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(BatchSettingSiteBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    private Object siteIds;
    private Object groupNames;
    private Object filled;
    private Object content;
    private Object type;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        WorkSiteHqlCondition wsc;
        String s;
        Object parse;
        this.siteIds = rootBp.getInputParamValue(this.taskId, this.inputParams, BatchSettingSiteBpField.siteIds);
        this.groupNames = rootBp.getInputParamValue(this.taskId, this.inputParams, BatchSettingSiteBpField.groupNames);
        this.filled = rootBp.getInputParamValue(this.taskId, this.inputParams, BatchSettingSiteBpField.filled);
        this.content = rootBp.getInputParamValue(this.taskId, this.inputParams, BatchSettingSiteBpField.content);
        this.type = rootBp.getInputParamValue(this.taskId, this.inputParams, BatchSettingSiteBpField.type);
        if (this.filled == null) {
            throw new Exception("@{wind.bp.fillParams}");
        }
        List groupList = new ArrayList();
        List siteIdsList = new ArrayList();
        if (this.groupNames != null) {
            try {
                parse = JSON.parse((Object)this.groupNames);
                s = parse.toString();
                groupList = JSONObject.parseArray((String)s, String.class);
            }
            catch (Exception e) {
                throw new BpRuntimeException(String.format("@{response.code.paramsError}:%s", this.groupNames), (Throwable)e);
            }
        }
        if (this.siteIds != null) {
            try {
                parse = JSON.parse((Object)this.siteIds);
                s = parse.toString();
                siteIdsList = JSONObject.parseArray((String)s, String.class);
            }
            catch (Exception e) {
                throw new BpRuntimeException(String.format("@{response.code.paramsError}:%s", this.siteIds), (Throwable)e);
            }
        }
        log.info("BatchSettingSiteBp taskRecordId = {}, siteIds={}, groupNames={}, filled={}, content={}, type={}", new Object[]{this.taskRecord.getId(), this.siteIds, this.groupNames, this.filled, this.content, this.type});
        boolean fill = Boolean.parseBoolean(this.filled.toString());
        WorkSiteVo wsv = new WorkSiteVo();
        wsv.setFilled(Boolean.valueOf(fill));
        wsv.setContent(fill ? (this.content != null ? this.content.toString() : null) : "");
        int num = 0;
        if (CollectionUtils.isNotEmpty(groupList)) {
            wsc = new WorkSiteHqlCondition();
            wsc.setType(this.type != null ? Integer.valueOf(Boolean.parseBoolean(this.type.toString()) ? 1 : 0) : null);
            wsc.setGroupNames(groupList.toArray(new String[groupList.size()]));
            num += this.workSiteService.updateSitesByCondition(wsc, wsv);
        }
        if (CollectionUtils.isNotEmpty(siteIdsList)) {
            wsc = new WorkSiteHqlCondition();
            wsc.setType(this.type != null ? Integer.valueOf(Boolean.parseBoolean(this.type.toString()) ? 1 : 0) : null);
            wsc.setSiteIds(siteIdsList.toArray(new String[siteIdsList.size()]));
            num += this.workSiteService.updateSitesByCondition(wsc, wsv);
        }
        if (CollectionUtils.isEmpty(siteIdsList) && CollectionUtils.isEmpty(groupList)) {
            wsc = new WorkSiteHqlCondition();
            wsc.setType(this.type != null ? Integer.valueOf(Boolean.parseBoolean(this.type.toString()) ? 1 : 0) : null);
            num += this.workSiteService.updateSitesByCondition(wsc, wsv);
        }
        this.saveLogInfo(String.format("@{wind.bp.updateNum}=%s", num));
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) {
        BatchSettingSiteBp bpData = new BatchSettingSiteBp();
        bpData.setFilled(this.filled);
        bpData.setContent(this.content);
        bpData.setSiteIds(this.siteIds);
        bpData.setType(this.type);
        bpData.setGroupNames(this.groupNames);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteService getWorkSiteService() {
        return this.workSiteService;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public Object getSiteIds() {
        return this.siteIds;
    }

    public Object getGroupNames() {
        return this.groupNames;
    }

    public Object getFilled() {
        return this.filled;
    }

    public Object getContent() {
        return this.content;
    }

    public Object getType() {
        return this.type;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteService(WorkSiteService workSiteService) {
        this.workSiteService = workSiteService;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setSiteIds(Object siteIds) {
        this.siteIds = siteIds;
    }

    public void setGroupNames(Object groupNames) {
        this.groupNames = groupNames;
    }

    public void setFilled(Object filled) {
        this.filled = filled;
    }

    public void setContent(Object content) {
        this.content = content;
    }

    public void setType(Object type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BatchSettingSiteBp)) {
            return false;
        }
        BatchSettingSiteBp other = (BatchSettingSiteBp)o;
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
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        Object this$siteIds = this.getSiteIds();
        Object other$siteIds = other.getSiteIds();
        if (this$siteIds == null ? other$siteIds != null : !this$siteIds.equals(other$siteIds)) {
            return false;
        }
        Object this$groupNames = this.getGroupNames();
        Object other$groupNames = other.getGroupNames();
        if (this$groupNames == null ? other$groupNames != null : !this$groupNames.equals(other$groupNames)) {
            return false;
        }
        Object this$filled = this.getFilled();
        Object other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !this$filled.equals(other$filled)) {
            return false;
        }
        Object this$content = this.getContent();
        Object other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        Object this$type = this.getType();
        Object other$type = other.getType();
        return !(this$type == null ? other$type != null : !this$type.equals(other$type));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BatchSettingSiteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WorkSiteService $workSiteService = this.getWorkSiteService();
        result = result * 59 + ($workSiteService == null ? 43 : $workSiteService.hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        Object $siteIds = this.getSiteIds();
        result = result * 59 + ($siteIds == null ? 43 : $siteIds.hashCode());
        Object $groupNames = this.getGroupNames();
        result = result * 59 + ($groupNames == null ? 43 : $groupNames.hashCode());
        Object $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : $filled.hashCode());
        Object $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        Object $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        return result;
    }

    public String toString() {
        return "BatchSettingSiteBp(windService=" + this.getWindService() + ", workSiteService=" + this.getWorkSiteService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", siteIds=" + this.getSiteIds() + ", groupNames=" + this.getGroupNames() + ", filled=" + this.getFilled() + ", content=" + this.getContent() + ", type=" + this.getType() + ")";
    }
}

