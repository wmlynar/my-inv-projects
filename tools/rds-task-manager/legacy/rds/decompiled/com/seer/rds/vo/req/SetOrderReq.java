/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.EventDef
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.vo.req.SetOrderReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import com.seer.rds.model.wind.EventDef;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.WindTaskDef;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;

@ApiModel(value="\u8fd0\u884c\u4efb\u52a1\u8bf7\u6c42\u53c2\u6570")
public class SetOrderReq
implements Serializable {
    @ApiModelProperty(value="\u4efb\u52a1id")
    private String taskId;
    @ApiModelProperty(value="\u4efb\u52a1\u5b9e\u4f8bid")
    private String taskRecordId;
    @ApiModelProperty(value="\u4efb\u52a1\u540d")
    private String taskLabel;
    @ApiModelProperty(value="\u4efb\u52a1\u5168\u5c40\u8f93\u5165\u53c2\u6570")
    private String inputParams;
    @ApiModelProperty(value="\u4efb\u52a1\u53d1\u8d77\u8005\u5c97\u4f4d")
    private String callWorkType;
    @ApiModelProperty(value="\u4efb\u52a1\u53d1\u8d77\u8005\u5de5\u4f4d")
    private String callWorkStation;
    private WindTaskDef windTaskDef;
    private EventDef eventDef;
    private InterfacePreHandle interfacePreHandle;
    private String parentTaskRecordId;
    private String rootTaskRecordId;
    @ApiModelProperty(value="\u4efb\u52a1\u4f18\u5148\u7ea7")
    private Integer priority;
    private String url;
    private String method;
    private String detail;

    public String getTaskId() {
        return this.taskId;
    }

    public String getTaskRecordId() {
        return this.taskRecordId;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public String getInputParams() {
        return this.inputParams;
    }

    public String getCallWorkType() {
        return this.callWorkType;
    }

    public String getCallWorkStation() {
        return this.callWorkStation;
    }

    public WindTaskDef getWindTaskDef() {
        return this.windTaskDef;
    }

    public EventDef getEventDef() {
        return this.eventDef;
    }

    public InterfacePreHandle getInterfacePreHandle() {
        return this.interfacePreHandle;
    }

    public String getParentTaskRecordId() {
        return this.parentTaskRecordId;
    }

    public String getRootTaskRecordId() {
        return this.rootTaskRecordId;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public String getUrl() {
        return this.url;
    }

    public String getMethod() {
        return this.method;
    }

    public String getDetail() {
        return this.detail;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setTaskRecordId(String taskRecordId) {
        this.taskRecordId = taskRecordId;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setInputParams(String inputParams) {
        this.inputParams = inputParams;
    }

    public void setCallWorkType(String callWorkType) {
        this.callWorkType = callWorkType;
    }

    public void setCallWorkStation(String callWorkStation) {
        this.callWorkStation = callWorkStation;
    }

    public void setWindTaskDef(WindTaskDef windTaskDef) {
        this.windTaskDef = windTaskDef;
    }

    public void setEventDef(EventDef eventDef) {
        this.eventDef = eventDef;
    }

    public void setInterfacePreHandle(InterfacePreHandle interfacePreHandle) {
        this.interfacePreHandle = interfacePreHandle;
    }

    public void setParentTaskRecordId(String parentTaskRecordId) {
        this.parentTaskRecordId = parentTaskRecordId;
    }

    public void setRootTaskRecordId(String rootTaskRecordId) {
        this.rootTaskRecordId = rootTaskRecordId;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetOrderReq)) {
            return false;
        }
        SetOrderReq other = (SetOrderReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$priority = this.getPriority();
        Integer other$priority = other.getPriority();
        if (this$priority == null ? other$priority != null : !((Object)this$priority).equals(other$priority)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$taskRecordId = this.getTaskRecordId();
        String other$taskRecordId = other.getTaskRecordId();
        if (this$taskRecordId == null ? other$taskRecordId != null : !this$taskRecordId.equals(other$taskRecordId)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        if (this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel)) {
            return false;
        }
        String this$inputParams = this.getInputParams();
        String other$inputParams = other.getInputParams();
        if (this$inputParams == null ? other$inputParams != null : !this$inputParams.equals(other$inputParams)) {
            return false;
        }
        String this$callWorkType = this.getCallWorkType();
        String other$callWorkType = other.getCallWorkType();
        if (this$callWorkType == null ? other$callWorkType != null : !this$callWorkType.equals(other$callWorkType)) {
            return false;
        }
        String this$callWorkStation = this.getCallWorkStation();
        String other$callWorkStation = other.getCallWorkStation();
        if (this$callWorkStation == null ? other$callWorkStation != null : !this$callWorkStation.equals(other$callWorkStation)) {
            return false;
        }
        WindTaskDef this$windTaskDef = this.getWindTaskDef();
        WindTaskDef other$windTaskDef = other.getWindTaskDef();
        if (this$windTaskDef == null ? other$windTaskDef != null : !this$windTaskDef.equals(other$windTaskDef)) {
            return false;
        }
        EventDef this$eventDef = this.getEventDef();
        EventDef other$eventDef = other.getEventDef();
        if (this$eventDef == null ? other$eventDef != null : !this$eventDef.equals(other$eventDef)) {
            return false;
        }
        InterfacePreHandle this$interfacePreHandle = this.getInterfacePreHandle();
        InterfacePreHandle other$interfacePreHandle = other.getInterfacePreHandle();
        if (this$interfacePreHandle == null ? other$interfacePreHandle != null : !this$interfacePreHandle.equals(other$interfacePreHandle)) {
            return false;
        }
        String this$parentTaskRecordId = this.getParentTaskRecordId();
        String other$parentTaskRecordId = other.getParentTaskRecordId();
        if (this$parentTaskRecordId == null ? other$parentTaskRecordId != null : !this$parentTaskRecordId.equals(other$parentTaskRecordId)) {
            return false;
        }
        String this$rootTaskRecordId = this.getRootTaskRecordId();
        String other$rootTaskRecordId = other.getRootTaskRecordId();
        if (this$rootTaskRecordId == null ? other$rootTaskRecordId != null : !this$rootTaskRecordId.equals(other$rootTaskRecordId)) {
            return false;
        }
        String this$url = this.getUrl();
        String other$url = other.getUrl();
        if (this$url == null ? other$url != null : !this$url.equals(other$url)) {
            return false;
        }
        String this$method = this.getMethod();
        String other$method = other.getMethod();
        if (this$method == null ? other$method != null : !this$method.equals(other$method)) {
            return false;
        }
        String this$detail = this.getDetail();
        String other$detail = other.getDetail();
        return !(this$detail == null ? other$detail != null : !this$detail.equals(other$detail));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetOrderReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : ((Object)$priority).hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $taskRecordId = this.getTaskRecordId();
        result = result * 59 + ($taskRecordId == null ? 43 : $taskRecordId.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        String $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : $inputParams.hashCode());
        String $callWorkType = this.getCallWorkType();
        result = result * 59 + ($callWorkType == null ? 43 : $callWorkType.hashCode());
        String $callWorkStation = this.getCallWorkStation();
        result = result * 59 + ($callWorkStation == null ? 43 : $callWorkStation.hashCode());
        WindTaskDef $windTaskDef = this.getWindTaskDef();
        result = result * 59 + ($windTaskDef == null ? 43 : $windTaskDef.hashCode());
        EventDef $eventDef = this.getEventDef();
        result = result * 59 + ($eventDef == null ? 43 : $eventDef.hashCode());
        InterfacePreHandle $interfacePreHandle = this.getInterfacePreHandle();
        result = result * 59 + ($interfacePreHandle == null ? 43 : $interfacePreHandle.hashCode());
        String $parentTaskRecordId = this.getParentTaskRecordId();
        result = result * 59 + ($parentTaskRecordId == null ? 43 : $parentTaskRecordId.hashCode());
        String $rootTaskRecordId = this.getRootTaskRecordId();
        result = result * 59 + ($rootTaskRecordId == null ? 43 : $rootTaskRecordId.hashCode());
        String $url = this.getUrl();
        result = result * 59 + ($url == null ? 43 : $url.hashCode());
        String $method = this.getMethod();
        result = result * 59 + ($method == null ? 43 : $method.hashCode());
        String $detail = this.getDetail();
        result = result * 59 + ($detail == null ? 43 : $detail.hashCode());
        return result;
    }

    public String toString() {
        return "SetOrderReq(taskId=" + this.getTaskId() + ", taskRecordId=" + this.getTaskRecordId() + ", taskLabel=" + this.getTaskLabel() + ", inputParams=" + this.getInputParams() + ", callWorkType=" + this.getCallWorkType() + ", callWorkStation=" + this.getCallWorkStation() + ", windTaskDef=" + this.getWindTaskDef() + ", eventDef=" + this.getEventDef() + ", interfacePreHandle=" + this.getInterfacePreHandle() + ", parentTaskRecordId=" + this.getParentTaskRecordId() + ", rootTaskRecordId=" + this.getRootTaskRecordId() + ", priority=" + this.getPriority() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", detail=" + this.getDetail() + ")";
    }
}

