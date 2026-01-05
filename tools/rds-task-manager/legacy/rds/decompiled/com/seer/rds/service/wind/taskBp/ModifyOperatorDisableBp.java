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
 *  com.seer.rds.service.wind.taskBp.ModifyOperatorDisableBp
 *  com.seer.rds.util.YmlConfigUtil
 *  com.seer.rds.vo.wind.ModifyOperatorDisableBpField
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
import com.seer.rds.vo.wind.ModifyOperatorDisableBpField;
import com.seer.rds.web.config.ConfigFileController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ModifyOperatorDisableBp")
@Scope(value="prototype")
public class ModifyOperatorDisableBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ModifyOperatorDisableBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    private WindTaskLog windTaskLog;
    private Object menuId;
    private Object disable;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object disableObj;
        this.menuId = "";
        Object workTypeObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModifyOperatorDisableBpField.menuId);
        if (workTypeObj != null) {
            this.menuId = workTypeObj.toString();
        }
        if ((disableObj = rootBp.getInputParamValue(this.taskId, this.inputParams, ModifyOperatorDisableBpField.disable)) != null) {
            this.disable = disableObj;
        }
        if (YmlConfigUtil.checkYamlRuntimeMenuPropsUpdate()) {
            ConfigFileController.commonConfig.getOperator().getOrders().stream().filter(s1 -> s1.getMenuId().equals(this.menuId)).forEach(s1 -> s1.setDisabled(Boolean.valueOf(Boolean.parseBoolean(this.disable.toString()))));
        } else {
            this.saveLogInfo("@{permission.historyApplicationBizFile}: \u3010runtimeMenuPropsUpdate\u3011@{wind.bp.must}\u3010true\u3011");
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ModifyOperatorDisableBp modifyOperatorDisableBp = new ModifyOperatorDisableBp();
        modifyOperatorDisableBp.setMenuId(this.menuId);
        modifyOperatorDisableBp.setDisable(this.disable);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)modifyOperatorDisableBp));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WindTaskRecordMapper getWindTaskRecordMapper() {
        return this.windTaskRecordMapper;
    }

    public WindTaskLog getWindTaskLog() {
        return this.windTaskLog;
    }

    public Object getMenuId() {
        return this.menuId;
    }

    public Object getDisable() {
        return this.disable;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWindTaskRecordMapper(WindTaskRecordMapper windTaskRecordMapper) {
        this.windTaskRecordMapper = windTaskRecordMapper;
    }

    public void setWindTaskLog(WindTaskLog windTaskLog) {
        this.windTaskLog = windTaskLog;
    }

    public void setMenuId(Object menuId) {
        this.menuId = menuId;
    }

    public void setDisable(Object disable) {
        this.disable = disable;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ModifyOperatorDisableBp)) {
            return false;
        }
        ModifyOperatorDisableBp other = (ModifyOperatorDisableBp)o;
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
        WindTaskLog this$windTaskLog = this.getWindTaskLog();
        WindTaskLog other$windTaskLog = other.getWindTaskLog();
        if (this$windTaskLog == null ? other$windTaskLog != null : !this$windTaskLog.equals(other$windTaskLog)) {
            return false;
        }
        Object this$menuId = this.getMenuId();
        Object other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        Object this$disable = this.getDisable();
        Object other$disable = other.getDisable();
        return !(this$disable == null ? other$disable != null : !this$disable.equals(other$disable));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ModifyOperatorDisableBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WindTaskRecordMapper $windTaskRecordMapper = this.getWindTaskRecordMapper();
        result = result * 59 + ($windTaskRecordMapper == null ? 43 : $windTaskRecordMapper.hashCode());
        WindTaskLog $windTaskLog = this.getWindTaskLog();
        result = result * 59 + ($windTaskLog == null ? 43 : $windTaskLog.hashCode());
        Object $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        Object $disable = this.getDisable();
        result = result * 59 + ($disable == null ? 43 : $disable.hashCode());
        return result;
    }

    public String toString() {
        return "ModifyOperatorDisableBp(windService=" + this.getWindService() + ", windTaskRecordMapper=" + this.getWindTaskRecordMapper() + ", windTaskLog=" + this.getWindTaskLog() + ", menuId=" + this.getMenuId() + ", disable=" + this.getDisable() + ")";
    }
}

