/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.taskBp.SetOutOrderNoBp
 *  com.seer.rds.vo.wind.SetOutOrderNoField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.SetOutOrderNoField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetOutOrderNoBp")
@Scope(value="prototype")
public class SetOutOrderNoBp
extends AbstractBp<WindTaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(SetOutOrderNoBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private Object orderNoObj;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.orderNoObj = rootBp.getInputParamValue(this.taskId, this.inputParams, SetOutOrderNoField.orderNo);
        log.info("setOutOrderNo orderNo=" + this.orderNoObj);
        this.windTaskRecordMapper.updateOutOrderNoById(this.orderNoObj.toString(), ((WindTaskRecord)this.taskRecord).getId());
        ((WindTaskRecord)this.taskRecord).setOutOrderNo(this.orderNoObj.toString());
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        SetOutOrderNoBp bpData = new SetOutOrderNoBp();
        bpData.setOrderNoObj(this.orderNoObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((WindTaskRecord)this.taskRecord).getProjectId(), this.taskId, ((WindTaskRecord)this.taskRecord).getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public Object getOrderNoObj() {
        return this.orderNoObj;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setOrderNoObj(Object orderNoObj) {
        this.orderNoObj = orderNoObj;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetOutOrderNoBp)) {
            return false;
        }
        SetOutOrderNoBp other = (SetOutOrderNoBp)o;
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
        Object this$orderNoObj = this.getOrderNoObj();
        Object other$orderNoObj = other.getOrderNoObj();
        return !(this$orderNoObj == null ? other$orderNoObj != null : !this$orderNoObj.equals(other$orderNoObj));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetOutOrderNoBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        Object $orderNoObj = this.getOrderNoObj();
        result = result * 59 + ($orderNoObj == null ? 43 : $orderNoObj.hashCode());
        return result;
    }

    public String toString() {
        return "SetOutOrderNoBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", orderNoObj=" + this.getOrderNoObj() + ")";
    }
}

