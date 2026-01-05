/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.MediaTypeEnum
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.PostBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.PostBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSON;
import com.google.common.collect.Maps;
import com.seer.rds.constant.MediaTypeEnum;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.PostBpField;
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

@Component(value="PostBp")
@Scope(value="prototype")
public class PostBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(PostBp.class);
    @Autowired
    private WindService windService;
    private String url;
    private Object param;
    private Object header;
    private Object retry;
    private Object retryTimes;
    private Object retryInterval;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.url = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, PostBpField.url);
        this.param = rootBp.getInputParamValue(this.taskId, this.inputParams, PostBpField.param);
        this.header = rootBp.getInputParamValue(this.taskId, this.inputParams, PostBpField.header);
        this.retry = rootBp.getInputParamValue(this.taskId, this.inputParams, PostBpField.retry);
        this.retryTimes = rootBp.getInputParamValue(this.taskId, this.inputParams, PostBpField.retryTimes);
        this.retryInterval = rootBp.getInputParamValue(this.taskId, this.inputParams, PostBpField.retryInterval);
        String mediaType = (String)this.blockInputParamsValue.get(PostBpField.mediaType);
        log.info("PostBP url = " + this.url + ", param = " + this.param + ", header = " + this.header + ", retry = " + this.retry + ", retryTimes = " + this.retry + ", retryInterval = " + this.retryInterval + " type = " + OkHttpUtil.getMediaTypeEnum((String)mediaType));
        String paramString = JSON.toJSONString((Object)this.param);
        if (this.param instanceof String) {
            paramString = this.param.toString();
        }
        Map headerMap = new HashMap();
        if (this.header != null && this.header instanceof Map) {
            headerMap = (Map)this.header;
        }
        Map response = new HashMap();
        if (this.retry == null || !Boolean.parseBoolean(this.retry.toString())) {
            response = OkHttpUtil.post((String)this.url, (String)paramString, headerMap, (MediaTypeEnum)OkHttpUtil.getMediaTypeEnum((String)mediaType));
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
                response = OkHttpUtil.post((String)this.url, (String)paramString, headerMap, (MediaTypeEnum)OkHttpUtil.getMediaTypeEnum((String)mediaType));
                break;
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException e) {
                log.error(e + ",try again...");
                if (count == Integer.parseInt(this.retryTimes.toString())) {
                    throw e;
                }
            }
            finally {
                ++count;
            }
            Thread.sleep(Integer.parseInt(this.retryInterval.toString()));
        }
        log.info("will set outputParamsMap");
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(PostBpField.response, response);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult(response);
        log.info("getInputParamsAndExecute run finished");
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, String> map = new HashMap<String, String>();
        map.put(PostBpField.url, this.url);
        map.put(PostBpField.param, JSON.toJSONString((Object)this.param));
        this.blockRecord.setBlockInputParamsValue(JSON.toJSONString(map));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }
}

