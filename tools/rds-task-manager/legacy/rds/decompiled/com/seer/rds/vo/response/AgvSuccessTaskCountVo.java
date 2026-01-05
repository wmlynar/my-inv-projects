/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.AgvSuccessTaskCountVo
 *  com.seer.rds.vo.response.AgvSuccessTaskCountVo$AgvSuccessTaskCountVoBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.AgvSuccessTaskCountVo;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;
import java.util.HashMap;

@ApiModel(value="\u673a\u5668\u4eba\u4efb\u52a1\u6210\u529f\u5b8c\u6210\u6570\u91cf\u8fd4\u56de\u5bf9\u8c61")
public class AgvSuccessTaskCountVo
implements Serializable {
    private String agvId;
    @ApiModelProperty(example="{'task1': 12, 'task2': 5 .....}")
    private HashMap<String, Integer> tasks;

    public static AgvSuccessTaskCountVoBuilder builder() {
        return new AgvSuccessTaskCountVoBuilder();
    }

    public String getAgvId() {
        return this.agvId;
    }

    public HashMap<String, Integer> getTasks() {
        return this.tasks;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setTasks(HashMap<String, Integer> tasks) {
        this.tasks = tasks;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AgvSuccessTaskCountVo)) {
            return false;
        }
        AgvSuccessTaskCountVo other = (AgvSuccessTaskCountVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        HashMap this$tasks = this.getTasks();
        HashMap other$tasks = other.getTasks();
        return !(this$tasks == null ? other$tasks != null : !((Object)this$tasks).equals(other$tasks));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AgvSuccessTaskCountVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        HashMap $tasks = this.getTasks();
        result = result * 59 + ($tasks == null ? 43 : ((Object)$tasks).hashCode());
        return result;
    }

    public String toString() {
        return "AgvSuccessTaskCountVo(agvId=" + this.getAgvId() + ", tasks=" + this.getTasks() + ")";
    }

    public AgvSuccessTaskCountVo(String agvId, HashMap<String, Integer> tasks) {
        this.agvId = agvId;
        this.tasks = tasks;
    }

    public AgvSuccessTaskCountVo() {
    }
}

