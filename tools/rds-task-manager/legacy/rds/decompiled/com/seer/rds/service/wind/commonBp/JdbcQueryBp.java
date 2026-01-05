/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.JdbcQueryBp
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.wind.JdbcQueryBpField
 *  com.seer.rds.vo.wind.ParamPreField
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
import com.google.common.collect.Maps;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.wind.JdbcQueryBpField;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component(value="JdbcQueryBp")
@Scope(value="prototype")
public class JdbcQueryBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(JdbcQueryBp.class);
    @Autowired
    private WindService windService;
    private String sql;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object sqlObject = rootBp.getInputParamValue(this.taskId, this.inputParams, JdbcQueryBpField.sql);
        if (sqlObject != null) {
            List list;
            try {
                this.sql = sqlObject.toString();
                JdbcTemplate template = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
                list = template.queryForList(this.sql);
            }
            catch (DataAccessException e) {
                log.error("" + e);
                throw new BpRuntimeException(String.format("@{wind.bp.errorSql}: %s", this.sql));
            }
            String resultSet = JSONObject.toJSONString((Object)list);
            Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
            ConcurrentMap childParamMap = Maps.newConcurrentMap();
            childParamMap.put(JdbcQueryBpField.resultSet, resultSet);
            paramMap.put(this.blockVo.getBlockName(), childParamMap);
            ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
            log.info("JdbcQueryBp result=" + resultSet);
            this.saveLogResult((Object)resultSet);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        JdbcQueryBp jdbcQueryBp = new JdbcQueryBp();
        jdbcQueryBp.setSql(this.sql);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)jdbcQueryBp));
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
        if (!(o instanceof JdbcQueryBp)) {
            return false;
        }
        JdbcQueryBp other = (JdbcQueryBp)o;
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
        return other instanceof JdbcQueryBp;
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
        return "JdbcQueryBp(windService=" + this.getWindService() + ", sql=" + this.getSql() + ")";
    }
}

