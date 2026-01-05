/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.GetBinTaskInfoBp
 *  com.seer.rds.vo.wind.GetBinTaskInfoBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.vo.wind.GetBinTaskInfoBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetBinTaskInfoBp")
@Scope(value="prototype")
public class GetBinTaskInfoBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetBinTaskInfoBp.class);
    @Autowired
    private WindService windService;
    private String agvId;
    private Object retry;
    private Object retryTimes;
    private Object retryInterval;
    private String targetKey;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.agvId = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GetBinTaskInfoBpField.agvId);
        this.retry = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBinTaskInfoBpField.retry);
        this.retryTimes = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBinTaskInfoBpField.retryTimes);
        this.retryInterval = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBinTaskInfoBpField.retryInterval);
        this.targetKey = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GetBinTaskInfoBpField.targetKey);
        log.info("GetBinTaskInfoBp agvId = " + this.agvId + ", retry = " + this.retry + ", retryTimes = " + this.retry + ", retryInterval = " + this.retryInterval + ", targetKey = " + this.targetKey);
        JSONObject info = null;
        if (this.retry == null || !Boolean.parseBoolean(this.retry.toString())) {
            info = this.getInfo();
        } else {
            int count = 1;
            if (this.retryTimes == null || this.retryTimes == "") {
                this.retryTimes = 1;
            }
            if (this.retryInterval == null || this.retryInterval == "") {
                this.retryInterval = 1000;
            }
            while (true) {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                if (count > Integer.parseInt(this.retryTimes.toString())) break;
                info = this.getInfo();
                log.info("try again...");
                Thread.sleep(Integer.parseInt(this.retryInterval.toString()));
                ++count;
            }
        }
        Map paramMap = (Map)((ConcurrentHashMap)RootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        HashMap childParamMap = Maps.newHashMap();
        childParamMap.put(GetBinTaskInfoBpField.response, info);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)RootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)(info != null ? info.toString() : null));
    }

    private JSONObject getInfo() {
        String robotsStatusStr;
        JSONObject jsonObject;
        JSONObject info = null;
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        if (cache != null && (jsonObject = JSONObject.parseObject((String)(robotsStatusStr = cache.toString()))).get((Object)"report") != null) {
            JSONArray rbkReports = jsonObject.getJSONArray("report");
            for (int i = 0; i < rbkReports.size(); ++i) {
                JSONObject rbkReport = rbkReports.getJSONObject(i);
                if (!rbkReport.getString("vehicle_id").equals(this.agvId)) continue;
                JSONObject infoAll = rbkReport.getJSONObject("rbk_report") != null ? rbkReport.getJSONObject("rbk_report").getJSONObject("info") : null;
                info = StringUtils.isNotEmpty((CharSequence)this.targetKey) && infoAll != null ? infoAll.getJSONObject(this.targetKey) : infoAll;
            }
        }
        return info;
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, String> map = new HashMap<String, String>();
        map.put(GetBinTaskInfoBpField.agvId, this.agvId);
        this.blockRecord.setBlockInputParamsValue(JSON.toJSONString(map));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }
}

