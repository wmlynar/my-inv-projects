/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CreateUuidBp
 *  com.seer.rds.vo.wind.CreateUuidBpField
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
import com.seer.rds.vo.wind.CreateUuidBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="CreateUuidBp")
@Scope(value="prototype")
public class CreateUuidBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(CreateUuidBp.class);
    @Autowired
    private WindService windService;
    private String createUuid;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.createUuid = UUID.randomUUID().toString();
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(CreateUuidBpField.createUuid, this.createUuid);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        log.info("UuidBp uuid=" + this.createUuid);
        this.saveLogResult((Object)this.createUuid);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        CreateUuidBp bpData = new CreateUuidBp();
        bpData.setCreateUuid(this.createUuid);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getCreateUuid() {
        return this.createUuid;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setCreateUuid(String createUuid) {
        this.createUuid = createUuid;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CreateUuidBp)) {
            return false;
        }
        CreateUuidBp other = (CreateUuidBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$createUuid = this.getCreateUuid();
        String other$createUuid = other.getCreateUuid();
        return !(this$createUuid == null ? other$createUuid != null : !this$createUuid.equals(other$createUuid));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CreateUuidBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $createUuid = this.getCreateUuid();
        result = result * 59 + ($createUuid == null ? 43 : $createUuid.hashCode());
        return result;
    }

    public String toString() {
        return "CreateUuidBp(windService=" + this.getWindService() + ", createUuid=" + this.getCreateUuid() + ")";
    }
}

