/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.JdbcExecuteBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.wind.JdbcExecuteBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.dao.DataAccessException
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.wind.JdbcExecuteBpField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component(value="JdbcExecuteBp")
@Scope(value="prototype")
public class JdbcExecuteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(JdbcExecuteBp.class);
    @Autowired
    private WindService windService;
    private String sql;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object sqlObject = rootBp.getInputParamValue(this.taskId, this.inputParams, JdbcExecuteBpField.sql);
        if (sqlObject != null) {
            try {
                this.sql = sqlObject.toString();
                JdbcTemplate template = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
                template.execute(this.sql);
            }
            catch (DataAccessException e) {
                log.error("" + e);
                throw new RuntimeException(String.format("@{wind.bp.errorSql}: %s", this.sql));
            }
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        JdbcExecuteBp JdbcExecuteBp2 = new JdbcExecuteBp();
        JdbcExecuteBp2.setSql(this.sql);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)JdbcExecuteBp2));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public String getSql() {
        return this.sql;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setSql(String sql) {
        this.sql = sql;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof JdbcExecuteBp)) {
            return false;
        }
        JdbcExecuteBp other = (JdbcExecuteBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        String this$sql = this.getSql();
        String other$sql = other.getSql();
        return !(this$sql == null ? other$sql != null : !this$sql.equals(other$sql));
    }

    protected boolean canEqual(Object other) {
        return other instanceof JdbcExecuteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        String $sql = this.getSql();
        result = result * 59 + ($sql == null ? 43 : $sql.hashCode());
        return result;
    }

    public String toString() {
        return "JdbcExecuteBp(windService=" + this.getWindService() + ", sql=" + this.getSql() + ")";
    }
}

