/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.Md5EncryptionForStringBp
 *  com.seer.rds.util.MD5Utils
 *  com.seer.rds.vo.wind.Md5EncryptionForStringBpFieId
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
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.util.MD5Utils;
import com.seer.rds.vo.wind.Md5EncryptionForStringBpFieId;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="Md5EncryptionForStringBp")
@Scope(value="prototype")
public class Md5EncryptionForStringBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(Md5EncryptionForStringBp.class);
    @Autowired
    private WindService windService;
    private String string;
    private String hexValue;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.string = rootBp.getInputParamValue(this.taskId, this.inputParams, Md5EncryptionForStringBpFieId.string).toString();
        try {
            this.hexValue = MD5Utils.MD5Lower((String)this.string);
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(Md5EncryptionForStringBpFieId.hexValue, this.hexValue);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            log.info(this.string);
            log.info(this.hexValue);
        }
        catch (Exception e) {
            log.error("Md5EncryptionForStringBp [{}] {}]", (Object)this.string, (Object)e.getMessage());
            throw e;
        }
        this.saveLogResult((Object)this.hexValue);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        Md5EncryptionForStringBp bpData = new Md5EncryptionForStringBp();
        bpData.setString(this.string);
        bpData.setHexValue(this.hexValue);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getString() {
        return this.string;
    }

    public String getHexValue() {
        return this.hexValue;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setString(String string) {
        this.string = string;
    }

    public void setHexValue(String hexValue) {
        this.hexValue = hexValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Md5EncryptionForStringBp)) {
            return false;
        }
        Md5EncryptionForStringBp other = (Md5EncryptionForStringBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$string = this.getString();
        String other$string = other.getString();
        if (this$string == null ? other$string != null : !this$string.equals(other$string)) {
            return false;
        }
        String this$hexValue = this.getHexValue();
        String other$hexValue = other.getHexValue();
        return !(this$hexValue == null ? other$hexValue != null : !this$hexValue.equals(other$hexValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Md5EncryptionForStringBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $string = this.getString();
        result = result * 59 + ($string == null ? 43 : $string.hashCode());
        String $hexValue = this.getHexValue();
        result = result * 59 + ($hexValue == null ? 43 : $hexValue.hashCode());
        return result;
    }

    public String toString() {
        return "Md5EncryptionForStringBp(windService=" + this.getWindService() + ", string=" + this.getString() + ", hexValue=" + this.getHexValue() + ")";
    }
}

