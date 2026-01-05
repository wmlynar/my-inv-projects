/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.GetBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.GetBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.GetBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetBp")
@Scope(value="prototype")
public class GetBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetBp.class);
    @Autowired
    private WindService windService;
    private String url;
    private Object header;
    private Object retry;
    private Object retryTimes;
    private Object retryInterval;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.url = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, GetBpField.url);
        this.header = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBpField.header);
        this.retry = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBpField.retry);
        this.retryTimes = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBpField.retryTimes);
        this.retryInterval = rootBp.getInputParamValue(this.taskId, this.inputParams, GetBpField.retryInterval);
        log.info("GetBp url = " + this.url + ", header = " + this.header + ", retry = " + this.retry + ", retryTimes = " + this.retry + ", retryInterval = " + this.retryInterval);
        Map headerMap = new HashMap();
        if (this.header != null && this.header instanceof Map) {
            headerMap = (Map)this.header;
        }
        String response = "";
        if (this.retry == null || !Boolean.parseBoolean(this.retry.toString())) {
            response = OkHttpUtil.getWithHeader((String)this.url, headerMap);
        }
        int count = 1;
        if (this.retryTimes == null || this.retryTimes == "") {
            this.retryTimes = 3;
        }
        if (this.retryInterval == null || this.retryInterval == "") {
            this.retryInterval = 1000;
        }
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            if (count > Integer.parseInt(this.retryTimes.toString())) break;
            try {
                response = OkHttpUtil.getWithHeader((String)this.url, headerMap);
                break;
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (Exception e) {
                log.error(e + ",try again...");
                this.saveLogError(e.getMessage());
                if (count == Integer.parseInt(this.retryTimes.toString())) {
                    throw new IOException(e.getMessage());
                }
            }
            finally {
                ++count;
            }
            Thread.sleep(Integer.parseInt(this.retryInterval.toString()));
        }
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        try {
            Object parse = JSONObject.parse((String)response);
            childParamMap.put(GetBpField.response, parse);
        }
        catch (Exception e) {
            throw new BpRuntimeException("can not cast to JSON.");
        }
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)response);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, String> map = new HashMap<String, String>();
        map.put(GetBpField.url, this.url);
        this.blockRecord.setBlockInputParamsValue(JSON.toJSONString(map));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }
}

