/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CheckTaskRecordIdIsExistBp
 *  com.seer.rds.vo.wind.CheckTaskRecordIdIsExistBpField
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
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.CheckTaskRecordIdIsExistBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="CheckTaskRecordIdIsExistBp")
@Scope(value="prototype")
public class CheckTaskRecordIdIsExistBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(CheckTaskRecordIdIsExistBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private String taskRecordId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) {
        Object taskRecordIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, CheckTaskRecordIdIsExistBpField.taskRecordId);
        if (taskRecordIdObj != null) {
            this.taskRecordId = taskRecordIdObj.toString();
            boolean taskRecordIdIsExist = false;
            WindTaskRecord windTaskRecord = this.windTaskRecordMapper.findById((Object)this.taskRecordId).orElse(null);
            if (windTaskRecord != null) {
                taskRecordIdIsExist = true;
            }
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(CheckTaskRecordIdIsExistBpField.isExist, taskRecordIdIsExist);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            log.info("CheckTaskRecordIdIsExistBp taskRecordIdIsExist=" + taskRecordIdIsExist);
            this.saveLogResult((Object)taskRecordIdIsExist);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        CheckTaskRecordIdIsExistBp checkTaskRecordIdIsExistBp = new CheckTaskRecordIdIsExistBp();
        checkTaskRecordIdIsExistBp.setTaskRecordId(this.taskRecordId);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)checkTaskRecordIdIsExistBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CheckTaskRecordIdIsExistBp)) {
            return false;
        }
        CheckTaskRecordIdIsExistBp other = (CheckTaskRecordIdIsExistBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        return !(this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CheckTaskRecordIdIsExistBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        return result;
    }

    public String toString() {
        return "CheckTaskRecordIdIsExistBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", taskRecordId=" + this.getTaskRecordId() + ")";
    }
}

