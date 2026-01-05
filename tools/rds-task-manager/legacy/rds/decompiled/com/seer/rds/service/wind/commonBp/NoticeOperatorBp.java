/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.NoticeOperatorBp
 *  com.seer.rds.vo.wind.NoticeOperatorBpField
 *  com.seer.rds.websocket.PDAMsgSender
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.NoticeOperatorBpField;
import com.seer.rds.websocket.PDAMsgSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="NoticeOperatorBp")
@Scope(value="prototype")
public class NoticeOperatorBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(NoticeOperatorBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private String workTypes;
    private String workStations;
    private String content;
    private Boolean needConfirm;
    private Integer keepTime;
    private Integer retryTimes;
    @Autowired
    private PDAMsgSender pdaMsgSender;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.workTypes = "";
        Object workTypeObj = rootBp.getInputParamValue(this.taskId, this.inputParams, NoticeOperatorBpField.workTypes);
        if (workTypeObj != null) {
            this.workTypes = workTypeObj.toString();
        }
        this.workStations = "";
        Object workStationsObj = rootBp.getInputParamValue(this.taskId, this.inputParams, NoticeOperatorBpField.workStations);
        if (workStationsObj != null) {
            this.workStations = workStationsObj.toString();
        }
        this.needConfirm = false;
        Object needConfirmObj = rootBp.getInputParamValue(this.taskId, this.inputParams, NoticeOperatorBpField.needConfirm);
        if (needConfirmObj != null) {
            this.needConfirm = Boolean.valueOf(needConfirmObj.toString());
        }
        this.keepTime = null;
        Object keepTimeObj = rootBp.getInputParamValue(this.taskId, this.inputParams, NoticeOperatorBpField.keepTime);
        if (keepTimeObj != null) {
            this.keepTime = Integer.valueOf(keepTimeObj.toString());
        }
        this.content = rootBp.getInputParamValue(this.taskId, this.inputParams, NoticeOperatorBpField.content).toString();
        Object retryTimesObj = rootBp.getInputParamValue(this.taskId, this.inputParams, NoticeOperatorBpField.retryTimes);
        this.retryTimes = retryTimesObj == null ? 0 : Integer.parseInt(retryTimesObj.toString());
        log.info("NoticeOperatorBp workTypes=" + this.workTypes + "\uff0cworkStations=" + this.workStations + "\uff0ccontent=" + this.content + "\uff0cneedConfirm=" + this.needConfirm + "\uff0ckeepTime=" + this.keepTime + "\uff0cretryTimes=" + retryTimesObj);
        this.pdaMsgSender.sendPadMsg(this.workTypes == null ? "" : this.workTypes, this.workStations == null ? "" : this.workStations, this.content, this.needConfirm, this.keepTime, this.retryTimes);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        NoticeOperatorBp bpData = new NoticeOperatorBp();
        bpData.setWorkTypes(this.workTypes);
        bpData.setWorkStations(this.workStations);
        bpData.setContent(this.content);
        bpData.setNeedConfirm(this.needConfirm);
        bpData.setKeepTime(this.keepTime);
        bpData.setRetryTimes(this.retryTimes);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public String getContent() {
        return this.content;
    }

    public Boolean getNeedConfirm() {
        return this.needConfirm;
    }

    public Integer getKeepTime() {
        return this.keepTime;
    }

    public Integer getRetryTimes() {
        return this.retryTimes;
    }

    public PDAMsgSender getPdaMsgSender() {
        return this.pdaMsgSender;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setNeedConfirm(Boolean needConfirm) {
        this.needConfirm = needConfirm;
    }

    public void setKeepTime(Integer keepTime) {
        this.keepTime = keepTime;
    }

    public void setRetryTimes(Integer retryTimes) {
        this.retryTimes = retryTimes;
    }

    public void setPdaMsgSender(PDAMsgSender pdaMsgSender) {
        this.pdaMsgSender = pdaMsgSender;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof NoticeOperatorBp)) {
            return false;
        }
        NoticeOperatorBp other = (NoticeOperatorBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$needConfirm = this.getNeedConfirm();
        Boolean other$needConfirm = other.getNeedConfirm();
        if (this$needConfirm == null ? other$needConfirm != null : !((Object)this$needConfirm).equals(other$needConfirm)) {
            return false;
        }
        Integer this$keepTime = this.getKeepTime();
        Integer other$keepTime = other.getKeepTime();
        if (this$keepTime == null ? other$keepTime != null : !((Object)this$keepTime).equals(other$keepTime)) {
            return false;
        }
        Integer this$retryTimes = this.getRetryTimes();
        Integer other$retryTimes = other.getRetryTimes();
        if (this$retryTimes == null ? other$retryTimes != null : !((Object)this$retryTimes).equals(other$retryTimes)) {
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
        String this$workTypes = this.getWorkTypes();
        String other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        String this$workStations = this.getWorkStations();
        String other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations)) {
            return false;
        }
        String this$content = this.getContent();
        String other$content = other.getContent();
        if (this$content == null ? other$content != null : !this$content.equals(other$content)) {
            return false;
        }
        PDAMsgSender this$pdaMsgSender = this.getPdaMsgSender();
        PDAMsgSender other$pdaMsgSender = other.getPdaMsgSender();
        return !(this$pdaMsgSender == null ? other$pdaMsgSender != null : !this$pdaMsgSender.equals(other$pdaMsgSender));
    }

    protected boolean canEqual(Object other) {
        return other instanceof NoticeOperatorBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $needConfirm = this.getNeedConfirm();
        result = result * 59 + ($needConfirm == null ? 43 : ((Object)$needConfirm).hashCode());
        Integer $keepTime = this.getKeepTime();
        result = result * 59 + ($keepTime == null ? 43 : ((Object)$keepTime).hashCode());
        Integer $retryTimes = this.getRetryTimes();
        result = result * 59 + ($retryTimes == null ? 43 : ((Object)$retryTimes).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        PDAMsgSender $pdaMsgSender = this.getPdaMsgSender();
        result = result * 59 + ($pdaMsgSender == null ? 43 : $pdaMsgSender.hashCode());
        return result;
    }

    public String toString() {
        return "NoticeOperatorBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", content=" + this.getContent() + ", needConfirm=" + this.getNeedConfirm() + ", keepTime=" + this.getKeepTime() + ", retryTimes=" + this.getRetryTimes() + ", pdaMsgSender=" + this.getPdaMsgSender() + ")";
    }
}

