/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.taskBp.WorkTypesBp
 *  com.seer.rds.vo.wind.WorkTypesBpField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.WorkTypesBpField;
import java.util.Arrays;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="WorkTypesBp")
@Scope(value="prototype")
public class WorkTypesBp
extends AbstractBp<WindTaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(WorkTypesBp.class);
    @Autowired
    private WindService windService;
    private Object workTypes;
    private Object workStations;
    public static ConcurrentHashMap<String, Object> cacheMap = new ConcurrentHashMap();

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.workTypes = rootBp.getInputParamValue(this.taskId, this.inputParams, WorkTypesBpField.workTypes);
        this.workStations = rootBp.getInputParamValue(this.taskId, this.inputParams, WorkTypesBpField.workStations);
        if (this.workTypes == null && this.workStations == null) {
            throw new RuntimeException("@{wind.bp.workTypeStation}");
        }
        WindTaskRecord windTaskRecord = this.windService.findById(((WindTaskRecord)this.taskRecord).getId());
        String cachedWorkTypes = windTaskRecord.getWorkTypes();
        Object workTypesResult = "";
        if (this.workTypes != null) {
            if (StringUtils.isNotEmpty((CharSequence)cachedWorkTypes)) {
                String[] workTypeSplited = this.workTypes.toString().split(",");
                String[] cachedWorkTypesSplited = cachedWorkTypes.split(",");
                HashSet<String> workTypesSet = new HashSet<String>();
                workTypesSet.addAll(Arrays.asList(workTypeSplited));
                workTypesSet.addAll(Arrays.asList(cachedWorkTypesSplited));
                for (Object e : workTypesSet) {
                    if (!StringUtils.isNotEmpty((CharSequence)e.toString())) continue;
                    workTypesResult = (String)workTypesResult + e + ",";
                }
                workTypesResult = ((String)workTypesResult).substring(0, ((String)workTypesResult).length() - 1);
            } else {
                workTypesResult = this.workTypes.toString();
            }
        } else {
            workTypesResult = cachedWorkTypes;
        }
        String cachedWorkStations = windTaskRecord.getWorkStations();
        Object workStationsResult = "";
        if (this.workStations != null) {
            if (StringUtils.isNotEmpty((CharSequence)cachedWorkStations)) {
                String[] workStationsSplited = this.workStations.toString().split(",");
                String[] cachedStationsSplited = cachedWorkStations.split(",");
                HashSet<String> hashSet = new HashSet<String>();
                hashSet.addAll(Arrays.asList(workStationsSplited));
                hashSet.addAll(Arrays.asList(cachedStationsSplited));
                for (Object e : hashSet) {
                    if (!StringUtils.isNotEmpty((CharSequence)e.toString())) continue;
                    workStationsResult = (String)workStationsResult + e + ",";
                }
                workStationsResult = ((String)workStationsResult).substring(0, ((String)workStationsResult).length() - 1);
            } else {
                workStationsResult = this.workStations.toString();
            }
        } else {
            workStationsResult = cachedWorkStations;
        }
        ((WindTaskRecord)this.taskRecord).setWorkTypes((String)workTypesResult);
        ((WindTaskRecord)this.taskRecord).setWorkStations((String)workStationsResult);
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        WorkTypesBp bpData = new WorkTypesBp();
        bpData.setWorkTypes(this.workTypes);
        bpData.setWorkStations(this.workStations);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), ((WindTaskRecord)this.taskRecord).getProjectId(), this.taskId, ((WindTaskRecord)this.taskRecord).getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getWorkTypes() {
        return this.workTypes;
    }

    public Object getWorkStations() {
        return this.workStations;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkTypes(Object workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(Object workStations) {
        this.workStations = workStations;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkTypesBp)) {
            return false;
        }
        WorkTypesBp other = (WorkTypesBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$workTypes = this.getWorkTypes();
        Object other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        Object this$workStations = this.getWorkStations();
        Object other$workStations = other.getWorkStations();
        return !(this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkTypesBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        Object $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        return result;
    }

    public String toString() {
        return "WorkTypesBp(windService=" + this.getWindService() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ")";
    }
}

