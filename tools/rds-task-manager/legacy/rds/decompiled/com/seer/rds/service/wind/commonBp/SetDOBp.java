/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.dao.RobotItemMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.SetDOBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.req.RobotIOReq
 *  com.seer.rds.vo.wind.SetDOBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.dao.RobotItemMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.req.RobotIOReq;
import com.seer.rds.vo.wind.SetDOBpField;
import java.net.ConnectException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="SetDOBp")
@Scope(value="prototype")
public class SetDOBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetDOBp.class);
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private RobotItemMapper robotItemMapper;
    @Autowired
    private WindService windService;
    private String agvId;
    private String id;
    private String status;

    public void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.agvId = rootBp.getInputParamValue(this.taskId, this.inputParams, SetDOBpField.agvId).toString();
        this.id = rootBp.getInputParamValue(this.taskId, this.inputParams, SetDOBpField.id).toString();
        this.status = rootBp.getInputParamValue(this.taskId, this.inputParams, SetDOBpField.status).toString();
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                RobotIOReq req = RobotIOReq.builder().vehicle(this.agvId).id(Integer.valueOf(Integer.parseInt(this.id))).type("DO").status(Boolean.valueOf(Boolean.parseBoolean(this.status))).build();
                Map resultMap = OkHttpUtil.postJson((String)RootBp.getUrl((String)ApiEnum.setRobotIO.getUri()), (String)JSONObject.toJSONString((Object)req));
                String str = JSON.parseObject((String)((String)resultMap.get("body"))).getString("msg");
                if (str.equals("ok")) break;
                log.error("SetDo error {}", (Object)str);
                this.saveLogError(str);
            }
            catch (ConnectException e) {
                log.error("SetDOBp [{},{},{}] {}]", new Object[]{this.agvId, this.id, this.status, e.getMessage()});
                this.saveLogError("@{response.code.robotStatusSycException}");
            }
            catch (NumberFormatException e) {
                log.error("SetDOBp [{},{},{}] {}]", new Object[]{this.agvId, this.id, this.status, e.getMessage()});
                throw new BpRuntimeException(String.format("@{response.code.paramsError}: %s", this.id));
            }
            Thread.sleep(2000L);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        SetDOBp bpData = new SetDOBp();
        bpData.setAgvId(this.agvId);
        bpData.setId(this.id);
        bpData.setStatus(this.status);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public RobotItemMapper getRobotItemMapper() {
        return this.robotItemMapper;
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

    public String getStatus() {
        return this.status;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setRobotItemMapper(RobotItemMapper robotItemMapper) {
        this.robotItemMapper = robotItemMapper;
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

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetDOBp)) {
            return false;
        }
        SetDOBp other = (SetDOBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindTaskRecordMapper this$windTaskRecordMapper = this.getWindTaskRecordMapper();
        WindTaskRecordMapper other$windTaskRecordMapper = other.getWindTaskRecordMapper();
        if (this$windTaskRecordMapper == null ? other$windTaskRecordMapper != null : !this$windTaskRecordMapper.equals(other$windTaskRecordMapper)) {
            return false;
        }
        RobotItemMapper this$robotItemMapper = this.getRobotItemMapper();
        RobotItemMapper other$robotItemMapper = other.getRobotItemMapper();
        if (this$robotItemMapper == null ? other$robotItemMapper != null : !this$robotItemMapper.equals(other$robotItemMapper)) {
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
        String this$status = this.getStatus();
        String other$status = other.getStatus();
        return !(this$status == null ? other$status != null : !this$status.equals(other$status));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetDOBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        RobotItemMapper $robotItemMapper = this.getRobotItemMapper();
        result = result * 59 + ($robotItemMapper == null ? 43 : $robotItemMapper.hashCode());
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        return result;
    }

    public String toString() {
        return "SetDOBp(windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", robotItemMapper=" + this.getRobotItemMapper() + ", windService=" + this.getWindService() + ", agvId=" + this.getAgvId() + ", id=" + this.getId() + ", status=" + this.getStatus() + ")";
    }
}

