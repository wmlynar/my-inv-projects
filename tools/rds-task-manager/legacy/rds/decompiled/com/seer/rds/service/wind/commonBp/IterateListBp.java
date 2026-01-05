/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.exception.TaskBreakException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.IterateListBp
 *  com.seer.rds.service.wind.commonBp.IterateListBp$BpData
 *  com.seer.rds.vo.wind.IterateListBpField
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.exception.TaskBreakException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.commonBp.IterateListBp;
import com.seer.rds.vo.wind.IterateListBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="IterateListBp")
@Scope(value="prototype")
public class IterateListBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(IterateListBp.class);
    @Autowired
    private WindService windService;
    private JSONArray array;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object arrayStr = rootBp.getInputParamValue(this.taskId, this.inputParams, IterateListBpField.list);
        if (arrayStr != null) {
            try {
                Object parse = JSON.parse((Object)arrayStr);
                String s = parse.toString();
                this.array = JSONObject.parseArray((String)s);
            }
            catch (Exception e) {
                throw new Exception(String.format("@{response.code.paramsError}:%s", arrayStr), e);
            }
        }
        if (this.array != null) {
            for (int i = 0; i < this.array.size(); ++i) {
                Integer Intdex;
                log.info("IterateListBp the {} cycles\uff0citem={}", (Object)i, this.array.get(i));
                Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
                Map stringObjectMap = (Map)paramMap.get(this.blockVo.getBlockName());
                if (stringObjectMap != null && (Intdex = (Integer)stringObjectMap.get(IterateListBpField.ctxIndex)) != null && i == 0) {
                    i = Intdex;
                }
                ConcurrentMap childParamMap = Maps.newConcurrentMap();
                childParamMap.put(IterateListBpField.ctxSize, this.array.size());
                childParamMap.put(IterateListBpField.ctxIndex, i);
                childParamMap.put(IterateListBpField.ctxItem, this.array.get(i));
                paramMap.put(this.blockVo.getBlockName(), childParamMap);
                ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
                this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
                this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
                this.saveLogInfo(String.format("@{wind.bp.loop}%s@{wind.bp.item}, item=%s", i + 1, this.array.get(i)));
                if (this.childDefaultArray == null) continue;
                JSONArray childArray = (JSONArray)this.childDefaultArray;
                try {
                    rootBp.executeChild(rootBp, this.taskId, this.taskRecord, childArray, Boolean.valueOf(true));
                    continue;
                }
                catch (TaskBreakException e) {
                    log.error("{} break", (Object)this.getClass().getSimpleName());
                    log.error(e.getMessage());
                    break;
                }
            }
            this.blockOutParamsValue.put(IterateListBpField.ctxIndex, 0);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        BpData bpData = new BpData();
        bpData.setList(this.array);
        bpData.setOutPutParams((Map)AbstratRootBp.outputParamsMap.get());
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.blockRecord.setBlockName(this.blockVo.getBlockType());
        this.blockRecord.setBlockConfigId(String.valueOf(this.blockVo.getBlockId()));
        this.blockRecord.setProjectId(this.taskRecord.getProjectId());
        this.blockRecord.setTaskId(this.taskId);
        this.blockRecord.setStartedOn(this.startOn);
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end.getStatus()));
        this.blockRecord.setEndedReason("[IterateListBp]@{wind.bp.end}");
        this.blockRecord.setEndedOn(new Date());
        this.windService.saveBlockRecord(this.blockRecord);
        RootBp.windTaskRecordMap.put(this.taskRecord.getId(), this.taskRecord);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
    }

    public WindService getWindService() {
        return this.windService;
    }

    public JSONArray getArray() {
        return this.array;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setArray(JSONArray array) {
        this.array = array;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof IterateListBp)) {
            return false;
        }
        IterateListBp other = (IterateListBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        JSONArray this$array = this.getArray();
        JSONArray other$array = other.getArray();
        return !(this$array == null ? other$array != null : !this$array.equals(other$array));
    }

    protected boolean canEqual(Object other) {
        return other instanceof IterateListBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        JSONArray $array = this.getArray();
        result = result * 59 + ($array == null ? 43 : $array.hashCode());
        return result;
    }

    public String toString() {
        return "IterateListBp(windService=" + this.getWindService() + ", array=" + this.getArray() + ")";
    }
}

