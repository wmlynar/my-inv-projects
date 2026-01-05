/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.service.wind.taskBp.WaitPassBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.wind.WaitPassBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.wind.WaitPassBpField;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="WaitPassBp")
@Scope(value="prototype")
public class WaitPassBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(WaitPassBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private String agvId;
    private Long waitPassTime;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        long startTime = this.startOn.getTime();
        this.agvId = String.valueOf(rootBp.getInputParamValue(this.taskId, this.inputParams, WaitPassBpField.agvId));
        this.waitPassTime = 123456789012345L;
        Object waitPassTimeObj = rootBp.getInputParamValue(this.taskId, this.inputParams, WaitPassBpField.waitPassTime);
        if (waitPassTimeObj != null) {
            this.waitPassTime = Long.valueOf(waitPassTimeObj.toString());
        }
        CacheDataBp.cacheMap.put("waitPass_" + this.agvId, "false");
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        windService.dataCache("waitPass_" + this.agvId, "false", 1);
        try {
            while (true) {
                WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
                this.saveLogSuspend("@{wind.bp.waitPass}...");
                ConcurrentHashMap dataCache = windService.getDataCache();
                String waitPass_status = (String)dataCache.get("waitPass_" + this.agvId);
                long currentTime = new Date().getTime();
                long difTime = currentTime - startTime;
                log.info("waitPass_status: {}, currentTime: {},waitPassTime: {}, difTime: {}", new Object[]{waitPass_status, currentTime, this.waitPassTime, difTime});
                if (waitPass_status.equals("true") || difTime >= this.waitPassTime) {
                    log.info("Pass Success waitPass_status: {}, currentTime: {},waitPassTime: {}, difTime: {}", new Object[]{waitPass_status, currentTime, this.waitPassTime, difTime});
                    this.saveLogResult((Object)"@{wind.bp.releaseSuccess}");
                    break;
                }
                Thread.sleep(2000L);
            }
        }
        catch (Exception e) {
            log.error("WaitPassBp [{},{}] {}]", new Object[]{this.agvId, this.waitPassTime, e.getMessage()});
            this.saveLogError(e.getMessage());
            throw e;
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        WaitPassBp bpData = new WaitPassBp();
        bpData.setAgvId(this.agvId);
        bpData.setWaitPassTime(this.waitPassTime);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public Long getWaitPassTime() {
        return this.waitPassTime;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setWaitPassTime(Long waitPassTime) {
        this.waitPassTime = waitPassTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WaitPassBp)) {
            return false;
        }
        WaitPassBp other = (WaitPassBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$waitPassTime = this.getWaitPassTime();
        Long other$waitPassTime = other.getWaitPassTime();
        if (this$waitPassTime == null ? other$waitPassTime != null : !((Object)this$waitPassTime).equals(other$waitPassTime)) {
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
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        return !(this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WaitPassBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $waitPassTime = this.getWaitPassTime();
        result = result * 59 + ($waitPassTime == null ? 43 : ((Object)$waitPassTime).hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        return result;
    }

    public String toString() {
        return "WaitPassBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", agvId=" + this.getAgvId() + ", waitPassTime=" + this.getWaitPassTime() + ")";
    }
}

