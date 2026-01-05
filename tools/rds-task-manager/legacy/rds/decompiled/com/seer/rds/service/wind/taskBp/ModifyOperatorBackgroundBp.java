/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.WindTaskLog
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.taskBp.ModifyOperatorBackgroundBp
 *  com.seer.rds.util.YmlConfigUtil
 *  com.seer.rds.vo.wind.ModifyOperatorBackgroundBpField
 *  com.seer.rds.web.config.ConfigFileController
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.wind.WindTaskLog;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.util.YmlConfigUtil;
import com.seer.rds.vo.wind.ModifyOperatorBackgroundBpField;
import com.seer.rds.web.config.ConfigFileController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModifyOperatorBackgroundBp")
@Scope(value="prototype")
public class ModifyOperatorBackgroundBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModifyOperatorBackgroundBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private Object menuId;
    private Object background;
    private WindTaskLog windTaskLog;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.menuId = "";
        Object menuIdObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModifyOperatorBackgroundBpField.menuId);
        if (menuIdObj != null) {
            this.menuId = menuIdObj.toString();
        }
        this.background = "";
        Object workStationsObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModifyOperatorBackgroundBpField.background);
        if (workStationsObj != null) {
            this.background = workStationsObj.toString();
        }
        if (YmlConfigUtil.checkYamlRuntimeMenuPropsUpdate()) {
            ConfigFileController.commonConfig.getOperator().getOrders().stream().filter(s1 -> s1.getMenuId().equals(this.menuId)).forEach(s1 -> s1.setMenuItemBackground(this.background.toString()));
        } else {
            this.saveLogInfo("@{permission.historyApplicationBizFile}: \u3010runtimeMenuPropsUpdate\u3011@{wind.bp.must}\u3010true\u3011");
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModifyOperatorBackgroundBp modifyOperatorBackgroundBp = new ModifyOperatorBackgroundBp();
        modifyOperatorBackgroundBp.setMenuId(this.menuId);
        modifyOperatorBackgroundBp.setBackground(this.background);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)modifyOperatorBackgroundBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public Object getMenuId() {
        return this.menuId;
    }

    public Object getBackground() {
        return this.background;
    }

    public WindTaskLog getWindTaskLog() {
        return this.windTaskLog;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setMenuId(Object menuId) {
        this.menuId = menuId;
    }

    public void setBackground(Object background) {
        this.background = background;
    }

    public void setWindTaskLog(WindTaskLog windTaskLog) {
        this.windTaskLog = windTaskLog;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModifyOperatorBackgroundBp)) {
            return false;
        }
        ModifyOperatorBackgroundBp other = (ModifyOperatorBackgroundBp)o;
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
        Object this$menuId = this.getMenuId();
        Object other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        Object this$background = this.getBackground();
        Object other$background = other.getBackground();
        if (this$background == null ? other$background != null : !this$background.equals(other$background)) {
            return false;
        }
        WindTaskLog this$windTaskLog = this.getWindTaskLog();
        WindTaskLog other$windTaskLog = other.getWindTaskLog();
        return !(this$windTaskLog == null ? other$windTaskLog != null : !this$windTaskLog.equals(other$windTaskLog));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModifyOperatorBackgroundBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        Object $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        Object $background = this.getBackground();
        result = result * 59 + ($background == null ? 43 : $background.hashCode());
        WindTaskLog $windTaskLog = this.getWindTaskLog();
        result = result * 59 + ($windTaskLog == null ? 43 : $windTaskLog.hashCode());
        return result;
    }

    public String toString() {
        return "ModifyOperatorBackgroundBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", menuId=" + this.getMenuId() + ", background=" + this.getBackground() + ", windTaskLog=" + this.getWindTaskLog() + ")";
    }
}

