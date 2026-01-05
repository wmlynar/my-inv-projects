/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.StringToJsonArrayBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.StringToJsonArrayBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.StringToJsonArrayBpField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="StringToJsonArrayBp")
@Scope(value="prototype")
public class StringToJsonArrayBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(StringToJsonArrayBp.class);
    private String convertString;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.convertString = rootBp.getInputParamValue(this.taskId, this.inputParams, StringToJsonArrayBpField.convertString).toString();
        JSONArray objects = JSONObject.parseArray((String)this.convertString);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(StringToJsonArrayBpField.convertArray, objects);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        log.info("JSONArray result=" + objects);
        this.saveLogResult((Object)objects);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public String getConvertString() {
        return this.convertString;
    }

    public void setConvertString(String convertString) {
        this.convertString = convertString;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StringToJsonArrayBp)) {
            return false;
        }
        StringToJsonArrayBp other = (StringToJsonArrayBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$convertString = this.getConvertString();
        String other$convertString = other.getConvertString();
        return !(this$convertString == null ? other$convertString != null : !this$convertString.equals(other$convertString));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StringToJsonArrayBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $convertString = this.getConvertString();
        result = result * 59 + ($convertString == null ? 43 : $convertString.hashCode());
        return result;
    }

    public String toString() {
        return "StringToJsonArrayBp(convertString=" + this.getConvertString() + ")";
    }
}

