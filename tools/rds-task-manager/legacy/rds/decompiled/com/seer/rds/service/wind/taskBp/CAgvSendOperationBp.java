/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskAGV
 *  com.seer.rds.service.wind.taskBp.CAgvOperationBp$Blocks
 *  com.seer.rds.service.wind.taskBp.CAgvSendOperationBp
 *  com.seer.rds.vo.wind.CAgvOperationBpField
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskAGV;
import com.seer.rds.service.wind.taskBp.CAgvOperationBp;
import com.seer.rds.vo.wind.CAgvOperationBpField;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component
@Scope(value="prototype")
public class CAgvSendOperationBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(CAgvSendOperationBp.class);
    @Autowired
    private WorkSiteMapper workSiteMapper;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object isEndAction = this.blockInputParamsValue.get(CAgvOperationBpField.isEndAction);
        CAgvOperationBp.Blocks block = new CAgvOperationBp.Blocks();
        String addBlockId = this.getBlockId();
        block.setBlockId(addBlockId);
        this.blockParams(rootBp, block);
        HashMap paramMap = Maps.newHashMap();
        boolean isEndActionBoolean = isEndAction != null && Boolean.parseBoolean(isEndAction.toString());
        String distributeBpFrom = RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId()) != null ? (String)((InheritableThreadLocal)RootBp.distributeOrderCache.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).get() : "";
        Object orderId = (String)((TaskRecord)this.taskRecord).getOrderId().get();
        if (StringUtils.equals((CharSequence)distributeBpFrom, (CharSequence)orderId)) {
            orderId = "fromOrder" + distributeBpFrom;
        }
        ArrayList blocks = Lists.newArrayList();
        blocks.add(block);
        paramMap.put("id", orderId);
        paramMap.put("blocks", blocks);
        log.info("CAgvSendOperationBp orderId\uff1a" + (String)orderId);
        if (isEndActionBoolean) {
            paramMap.put("complete", true);
        }
        this.saveBlock(addBlockId, (String)orderId);
        this.saveLogInfo(String.format("@{wind.bp.blockId}=%s,  @{wind.bp.working}=%s, %s", addBlockId, block.getLocation(), WindTaskAGV.operationLog((CAgvOperationBp.Blocks)block)));
        super.sendBlock((String)orderId, JSONObject.toJSONString((Object)paramMap), addBlockId);
        this.blockOutParamsValue.put("blockId", addBlockId);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    private String getBlockId() {
        String addBlockId = "";
        String blockOrderIdPre = "";
        ConcurrentHashMap cacheBlockIfResetMap = GlobalCacheConfig.getCacheBlockIfResetMap((String)((TaskRecord)this.taskRecord).getId());
        if (cacheBlockIfResetMap != null) {
            blockOrderIdPre = (String)cacheBlockIfResetMap.get("blockOrderId" + this.blockVo.getBlockId());
        }
        addBlockId = "End".equals(this.state) || "Running".equals(this.state) && !"".equals(blockOrderIdPre) && blockOrderIdPre != null ? blockOrderIdPre : (StringUtils.isNotEmpty((CharSequence)this.blockRecord.getBlockId()) ? this.blockRecord.getBlockId() : UUID.randomUUID().toString());
        return addBlockId;
    }

    private void saveBlock(String addBlockId, String orderId) {
        this.blockRecord.setBlockId(addBlockId);
        this.blockRecord.setOrderId(orderId);
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
    }

    private void blockParams(AbstratRootBp rootBp, CAgvOperationBp.Blocks block) {
        WorkSite workSite;
        String targetSiteLabel = (String)this.blockInputParamsValue.get(CAgvOperationBpField.targetSiteLabel);
        String postAction = (String)this.blockInputParamsValue.get(CAgvOperationBpField.postAction);
        String goodsId = (String)this.blockInputParamsValue.get(CAgvOperationBpField.goodsId);
        String scriptName = (String)this.blockInputParamsValue.get(CAgvOperationBpField.scriptName);
        String maxSpeedS = (String)this.blockInputParamsValue.get(CAgvOperationBpField.maxSpeed);
        String maxWSpeedS = (String)this.blockInputParamsValue.get(CAgvOperationBpField.maxWSpeed);
        String maxAccS = (String)this.blockInputParamsValue.get(CAgvOperationBpField.maxAcc);
        String maxWAccS = (String)this.blockInputParamsValue.get(CAgvOperationBpField.maxWAcc);
        String spinS = (String)this.blockInputParamsValue.get(CAgvOperationBpField.spin);
        Object adjustInfo = this.blockInputParamsValue.get(CAgvOperationBpField.adjustInfo);
        if (StringUtils.isNotEmpty((CharSequence)postAction)) {
            HashMap postActions = Maps.newHashMap();
            postActions.put("configId", postAction);
            block.setPostAction((Map)postActions);
        }
        if (StringUtils.isNotEmpty((CharSequence)goodsId)) {
            block.setGoodsId(goodsId);
        }
        HashMap robotMotionProfile = Maps.newHashMap();
        if (StringUtils.isNotEmpty((CharSequence)maxSpeedS)) {
            robotMotionProfile.put("max_speed", Double.valueOf(maxSpeedS));
        }
        if (StringUtils.isNotEmpty((CharSequence)maxWSpeedS)) {
            robotMotionProfile.put("max_wspeed", Double.valueOf(maxWSpeedS));
        }
        if (StringUtils.isNotEmpty((CharSequence)maxAccS)) {
            robotMotionProfile.put("max_acc", Double.valueOf(maxAccS));
        }
        if (StringUtils.isNotEmpty((CharSequence)maxWAccS)) {
            robotMotionProfile.put("max_wacc", Double.valueOf(maxWAccS));
        }
        if (StringUtils.isNotEmpty((CharSequence)spinS)) {
            robotMotionProfile.put("spin", Boolean.valueOf(spinS));
        }
        if (robotMotionProfile.size() != 0) {
            block.setRobotMotionProfile((Map)robotMotionProfile);
        }
        if (adjustInfo != null) {
            block.setAdjustInfo((List)JSONArray.parseArray((String)JSON.toJSONString(adjustInfo)));
        }
        if (StringUtils.isEmpty((CharSequence)targetSiteLabel)) {
            log.error("[CAgvSendOperationBp]targetSiteLabel is empty");
            throw new EndErrorException("@{wind.bp.emptyTargetSite}");
        }
        List bySiteId = this.workSiteMapper.findBySiteId(targetSiteLabel);
        if (bySiteId.size() > 0 && (workSite = (WorkSite)bySiteId.get(0)).getDisabled() != null && workSite.getDisabled() == 1) {
            throw new EndErrorException(targetSiteLabel + " @{permission.disableWorksite} ");
        }
        WindTaskAGV.getAGVScript((String)this.taskId, (String)scriptName, (AbstratRootBp)rootBp, (JSONObject)this.inputParams, (CAgvOperationBp.Blocks)block);
        block.setLocation(targetSiteLabel);
    }
}

