/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.TaskStatusMonitorNotice
 *  com.seer.rds.service.wind.taskBp.ThrowExceptionBp
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.ThrowExceptionBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
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
import com.seer.rds.vo.wind.ThrowExceptionBpField;
import java.util.Date;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ThrowExceptionBp")
@Scope(value="prototype")
public class ThrowExceptionBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(ThrowExceptionBp.class);
    private String message;
    @Autowired
    private WindService windService;
    @Autowired
    private EventSource eventSource;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.message = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, ThrowExceptionBpField.message);
        throw new Exception(this.message == null ? "" : this.message.toString());
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ThrowExceptionBp throwExceptionBp = new ThrowExceptionBp();
        throwExceptionBp.setMessage(this.message.toString());
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)this.message));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.startOn);
        RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
        throw new Exception(this.message.toString());
    }

    protected void ExceptionHandle(String className, AbstratRootBp rootBp, Exception e) {
        log.error("block run error", (Throwable)e);
        try {
            if (!((Boolean)RootBp.taskStatus.get(this.taskId + ((TaskRecord)this.taskRecord).getId())).booleanValue()) {
                return;
            }
        }
        catch (Exception ex) {
            log.error("ThrowExceptionBp error", (Throwable)ex);
        }
        this.windService.saveLog(TaskLogLevelEnum.error.getLevel(), String.format("[%s]@{wind.bp.fail}:", className) + e.getMessage(), ((TaskRecord)this.taskRecord).getProjectId(), this.taskId, ((TaskRecord)this.taskRecord).getId(), this.blockVo.getBlockId());
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.end_error.getStatus()));
        this.blockRecord.setEndedOn(new Date());
        this.blockRecord.setEndedReason("[ThrowExceptionBp]:" + e.getMessage());
        this.windService.saveBlockRecord(this.blockRecord);
        RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
        GlobalCacheConfig.cache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
        RootBp.taskStatus.put(this.taskId + ((TaskRecord)this.taskRecord).getId(), false);
        ((TaskRecord)this.taskRecord).setStatus(Integer.valueOf(TaskStatusEnum.end_error.getStatus()));
        ((TaskRecord)this.taskRecord).setEndedOn(new Date());
        ((TaskRecord)this.taskRecord).setEndedReason("[ThrowExceptionBp]:" + e.getMessage());
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
        RootBp.windTaskRecordMap.put(((TaskRecord)this.taskRecord).getId(), this.taskRecord);
        TaskStatusMonitorNotice.taskFailedNotice((TaskRecord)((TaskRecord)this.taskRecord), (WindBlockRecord)this.blockRecord, (WindBlockVo)this.blockVo, (String)this.taskId, (String)("[ThrowExceptionBp] Block Run Failure\uff1a" + e.getMessage()));
        WindEvent event = WindEvent.builder().type(Integer.valueOf(0)).status(String.valueOf(TaskStatusEnum.stop.getStatus())).taskId(this.taskId).taskRecord((TaskRecord)this.taskRecord).taskLabel(((TaskRecord)this.taskRecord).getDefLabel()).build();
        this.eventSource.notify(event);
        GlobalCacheConfig.cache((String)(((TaskRecord)this.taskRecord).getDefId() + ((TaskRecord)this.taskRecord).getId()), (Object)TaskStatusEnum.end_error.getStatus());
        RootBp.taskStatus.put(((TaskRecord)this.taskRecord).getDefId() + ((TaskRecord)this.taskRecord).getId(), false);
    }

    public String getMessage() {
        return this.message;
    }

    public WindService getWindService() {
        return this.windService;
    }

    public EventSource getEventSource() {
        return this.eventSource;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setEventSource(EventSource eventSource) {
        this.eventSource = eventSource;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ThrowExceptionBp)) {
            return false;
        }
        ThrowExceptionBp other = (ThrowExceptionBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$message = this.getMessage();
        String other$message = other.getMessage();
        if (this$message == null ? other$message != null : !this$message.equals(other$message)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        EventSource this$eventSource = this.getEventSource();
        EventSource other$eventSource = other.getEventSource();
        return !(this$eventSource == null ? other$eventSource != null : !this$eventSource.equals(other$eventSource));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ThrowExceptionBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        EventSource $eventSource = this.getEventSource();
        result = result * 59 + ($eventSource == null ? 43 : $eventSource.hashCode());
        return result;
    }

    public String toString() {
        return "ThrowExceptionBp(message=" + this.getMessage() + ", windService=" + this.getWindService() + ", eventSource=" + this.getEventSource() + ")";
    }
}

