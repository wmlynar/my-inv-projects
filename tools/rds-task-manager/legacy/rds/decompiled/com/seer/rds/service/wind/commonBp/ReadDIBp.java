/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.exception.OtherException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.ReadDIBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.ReadDIBpFieId
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.exception.OtherException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.ReadDIBpFieId;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ReadDIBp")
@Scope(value="prototype")
public class ReadDIBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ReadDIBp.class);
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private WindService windService;
    private String agvId;
    private String id;
    private Object status;

    public void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.agvId = rootBp.getInputParamValue(this.taskId, this.inputParams, ReadDIBpFieId.agvId).toString();
        this.id = rootBp.getInputParamValue(this.taskId, this.inputParams, ReadDIBpFieId.id).toString();
        String params = "?vehicles=" + this.agvId + "&paths=report.rbk_report.DI";
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                JSONObject parseObject;
                block10: {
                    Map resultMap = OkHttpUtil.getWithHttpCode((String)(RootBp.getUrl((String)ApiEnum.robotsStatus.getUri()) + params));
                    JSONArray jsonArray = JSONObject.parseObject((String)((String)resultMap.get("body"))).getJSONArray("report");
                    if (jsonArray != null) {
                        JSONArray jsonArrayDI = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getJSONArray("DI");
                        if (jsonArrayDI == null) {
                            this.saveLogError(String.format("%s @{wind.bp.robotDI}", this.agvId));
                            throw new OtherException();
                        }
                        for (int i = 0; i < jsonArrayDI.size(); ++i) {
                            parseObject = JSONObject.parseObject((String)jsonArrayDI.get(i).toString());
                            if (!StringUtils.equals((CharSequence)parseObject.getString("id"), (CharSequence)this.id)) {
                                continue;
                            }
                            break block10;
                        }
                        if (this.status == null) {
                            this.saveLogError(String.format("%s @{wind.bp.nonexistent} DI %s", this.agvId, this.id));
                            throw new OtherException();
                        }
                    }
                    this.saveLogError(String.format("%s @{wind.bp.nonexistent}", this.agvId));
                    throw new OtherException();
                }
                this.status = parseObject.get((Object)"status");
                break;
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException e) {
                log.error("ReadDIBp connect core error {}", (Object)e.getMessage());
                this.saveLogError(e.getMessage());
            }
            catch (OtherException e) {
                // empty catch block
            }
            Thread.sleep(500L);
        }
        StringBuilder message = new StringBuilder();
        message.append("agvId=").append(this.agvId).append(",id=").append(this.id).append(",status=").append(this.status);
        this.saveLogResult(this.status);
        log.info("ReadDIBp " + message);
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(ReadDIBpFieId.status, this.status);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ReadDIBp bpData = new ReadDIBp();
        bpData.setAgvId(this.agvId);
        bpData.setId(this.id);
        bpData.setStatus(this.status);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getId() {
        return this.id;
    }

    public Object getStatus() {
        return this.status;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setStatus(Object status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ReadDIBp)) {
            return false;
        }
        ReadDIBp other = (ReadDIBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Object this$status = this.getStatus();
        Object other$status = other.getStatus();
        return !(this$status == null ? other$status != null : !this$status.equals(other$status));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ReadDIBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        return result;
    }

    public String toString() {
        return "ReadDIBp(windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", windService=" + this.getWindService() + ", agvId=" + this.getAgvId() + ", id=" + this.getId() + ", status=" + this.getStatus() + ")";
    }
}

