/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.TaskStatusMonitorNotice
 *  com.seer.rds.service.wind.taskBp.TryCatchBp
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.TryCatchBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.StopException;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.TaskStatusMonitorNotice;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.TryCatchBpField;
import java.util.Date;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="TryCatchBp")
@Scope(value="prototype")
public class TryCatchBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(TryCatchBp.class);
    @Autowired
    private WindService windService;
    private Object swallowErrorObj;
    private Object ignoreAbortObj;
    private JSONArray tryChild;
    private Boolean swallowError;
    private Boolean ignoreAbort;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) {
        this.swallowErrorObj = rootBp.getInputParamValue(this.taskId, this.inputParams, TryCatchBpField.swallowError);
        this.swallowError = this.swallowErrorObj != null ? Boolean.parseBoolean(this.swallowErrorObj.toString()) : false;
        this.ignoreAbortObj = rootBp.getInputParamValue(this.taskId, this.inputParams, TryCatchBpField.ignoreAbort);
        this.ignoreAbort = this.swallowErrorObj != null ? Boolean.parseBoolean(this.ignoreAbortObj.toString()) : false;
        JSONObject child = (JSONObject)this.childDefaultArray;
        this.tryChild = child.getJSONArray(TryCatchBpField.tryChild);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        TryCatchBp bpData = new TryCatchBp();
        bpData.setIgnoreAbortObj(this.ignoreAbortObj);
        bpData.setSwallowErrorObj(this.swallowErrorObj);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
        if (this.tryChild != null && ((Boolean)RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).booleanValue()) {
            rootBp.executeChild(rootBp, this.taskId, this.taskRecord, this.tryChild, Boolean.valueOf(true));
        }
    }

    protected void ExceptionHandle(String className, AbstratRootBp rootBp, Exception e) {
        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), "[TryCatchBp]@{wind.bp.fail}:" + e.getMessage(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
        this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
        this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
        this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
        this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
        this.windService.saveErrorBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn, e);
        ((TaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.interrupt_error.getStatus()));
        ((TaskRecord)this.taskRecord).setEndedOn(new Date());
        ((TaskRecord)this.taskRecord).setEndedReason("[TryCatchBp]@{wind.bp.fail}:" + e.getMessage());
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
        if (!this.ignoreAbort.booleanValue()) {
            try {
                Thread.sleep(1000L);
            }
            catch (InterruptedException ex) {
                log.error("InterruptedException error", (Throwable)e);
            }
            JSONObject child = (JSONObject)this.childDefaultArray;
            JSONArray catchChild = child.getJSONArray(TryCatchBpField.catchChild);
            this.blockRecord.setOutputParams(JSONObject.toJSONString(AbstratRootBp.outputParamsMap.get()));
            this.blockRecord.setInputParams(JSONObject.toJSONString(AbstratRootBp.inputParamsMap.get()));
            this.blockRecord.setInternalVariables(JSONObject.toJSONString(AbstratRootBp.taskVariablesMap.get()));
            this.blockRecord.setBlockInputParams(this.inputParams != null ? this.inputParams.toJSONString() : null);
            this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
            if (catchChild != null) {
                rootBp.executeChild(rootBp, this.taskId, this.taskRecord, catchChild, Boolean.valueOf(true));
            }
        }
        if (!this.swallowError.booleanValue()) {
            throw new RuntimeException("try catch\u5757\u7ee7\u7eed\u629b\u51fa", e);
        }
        TaskStatusMonitorNotice.taskFailedNotice((TaskRecord)((TaskRecord)this.taskRecord), (WindBlockRecord)this.blockRecord, (WindBlockVo)this.blockVo, (String)this.taskId, (String)"[ThrowExceptionBp] try catch Block Throw Failure\uff1a");
        TaskStatusMonitorNotice.taskInterruptNotice((TaskRecord)((TaskRecord)this.taskRecord), (WindBlockRecord)this.blockRecord, (WindBlockVo)this.blockVo, (String)this.taskId);
        while (((Boolean)RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).booleanValue()) {
            log.error(this.getClass().getSimpleName() + " failed to run!");
            try {
                Thread.sleep(5000L);
            }
            catch (InterruptedException ex) {
                this.execute(rootBp, this.taskId, (BaseRecord)((TaskRecord)this.taskRecord), this.blockVo, this.inputParams, this.childDefaultArray);
                return;
            }
        }
    }

    protected void stopExceptionHandle(String className, AbstratRootBp rootBp, StopException e) {
        this.ExceptionHandle(className, rootBp, (Exception)e);
    }

    protected void endErrorExceptionHandle(String className, AbstratRootBp rootBp, EndErrorException e) {
        this.ExceptionHandle(className, rootBp, (Exception)e);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getSwallowErrorObj() {
        return this.swallowErrorObj;
    }

    public Object getIgnoreAbortObj() {
        return this.ignoreAbortObj;
    }

    public JSONArray getTryChild() {
        return this.tryChild;
    }

    public Boolean getSwallowError() {
        return this.swallowError;
    }

    public Boolean getIgnoreAbort() {
        return this.ignoreAbort;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setSwallowErrorObj(Object swallowErrorObj) {
        this.swallowErrorObj = swallowErrorObj;
    }

    public void setIgnoreAbortObj(Object ignoreAbortObj) {
        this.ignoreAbortObj = ignoreAbortObj;
    }

    public void setTryChild(JSONArray tryChild) {
        this.tryChild = tryChild;
    }

    public void setSwallowError(Boolean swallowError) {
        this.swallowError = swallowError;
    }

    public void setIgnoreAbort(Boolean ignoreAbort) {
        this.ignoreAbort = ignoreAbort;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TryCatchBp)) {
            return false;
        }
        TryCatchBp other = (TryCatchBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$swallowError = this.getSwallowError();
        Boolean other$swallowError = other.getSwallowError();
        if (this$swallowError == null ? other$swallowError != null : !((Object)this$swallowError).equals(other$swallowError)) {
            return false;
        }
        Boolean this$ignoreAbort = this.getIgnoreAbort();
        Boolean other$ignoreAbort = other.getIgnoreAbort();
        if (this$ignoreAbort == null ? other$ignoreAbort != null : !((Object)this$ignoreAbort).equals(other$ignoreAbort)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$swallowErrorObj = this.getSwallowErrorObj();
        Object other$swallowErrorObj = other.getSwallowErrorObj();
        if (this$swallowErrorObj == null ? other$swallowErrorObj != null : !this$swallowErrorObj.equals(other$swallowErrorObj)) {
            return false;
        }
        Object this$ignoreAbortObj = this.getIgnoreAbortObj();
        Object other$ignoreAbortObj = other.getIgnoreAbortObj();
        if (this$ignoreAbortObj == null ? other$ignoreAbortObj != null : !this$ignoreAbortObj.equals(other$ignoreAbortObj)) {
            return false;
        }
        JSONArray this$tryChild = this.getTryChild();
        JSONArray other$tryChild = other.getTryChild();
        return !(this$tryChild == null ? other$tryChild != null : !this$tryChild.equals(other$tryChild));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TryCatchBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $swallowError = this.getSwallowError();
        result = result * 59 + ($swallowError == null ? 43 : ((Object)$swallowError).hashCode());
        Boolean $ignoreAbort = this.getIgnoreAbort();
        result = result * 59 + ($ignoreAbort == null ? 43 : ((Object)$ignoreAbort).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $swallowErrorObj = this.getSwallowErrorObj();
        result = result * 59 + ($swallowErrorObj == null ? 43 : $swallowErrorObj.hashCode());
        Object $ignoreAbortObj = this.getIgnoreAbortObj();
        result = result * 59 + ($ignoreAbortObj == null ? 43 : $ignoreAbortObj.hashCode());
        JSONArray $tryChild = this.getTryChild();
        result = result * 59 + ($tryChild == null ? 43 : $tryChild.hashCode());
        return result;
    }

    public String toString() {
        return "TryCatchBp(windService=" + this.getWindService() + ", swallowErrorObj=" + this.getSwallowErrorObj() + ", ignoreAbortObj=" + this.getIgnoreAbortObj() + ", tryChild=" + this.getTryChild() + ", swallowError=" + this.getSwallowError() + ", ignoreAbort=" + this.getIgnoreAbort() + ")";
    }
}

