/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindBlockChildid
 *  com.seer.rds.model.wind.WindBlockChildid$WindBlockChildidBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindBlockChildid;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windblockchildid")
public class WindBlockChildid {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String projectId;
    private String taskId;
    private String blockId;
    private String contextKey;
    private Integer bindex;
    private String childId;

    public static WindBlockChildidBuilder builder() {
        return new WindBlockChildidBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getProjectId() {
        return this.projectId;
    }

    public String getTaskId() {
        return this.taskId;
    }

    public String getBlockId() {
        return this.blockId;
    }

    public String getContextKey() {
        return this.contextKey;
    }

    public Integer getBindex() {
        return this.bindex;
    }

    public String getChildId() {
        return this.childId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public void setBlockId(String blockId) {
        this.blockId = blockId;
    }

    public void setContextKey(String contextKey) {
        this.contextKey = contextKey;
    }

    public void setBindex(Integer bindex) {
        this.bindex = bindex;
    }

    public void setChildId(String childId) {
        this.childId = childId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindBlockChildid)) {
            return false;
        }
        WindBlockChildid other = (WindBlockChildid)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$bindex = this.getBindex();
        Integer other$bindex = other.getBindex();
        if (this$bindex == null ? other$bindex != null : !((Object)this$bindex).equals(other$bindex)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$projectId = this.getProjectId();
        String other$projectId = other.getProjectId();
        if (this$projectId == null ? other$projectId != null : !this$projectId.equals(other$projectId)) {
            return false;
        }
        String this$taskId = this.getTaskId();
        String other$taskId = other.getTaskId();
        if (this$taskId == null ? other$taskId != null : !this$taskId.equals(other$taskId)) {
            return false;
        }
        String this$blockId = this.getBlockId();
        String other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !this$blockId.equals(other$blockId)) {
            return false;
        }
        String this$contextKey = this.getContextKey();
        String other$contextKey = other.getContextKey();
        if (this$contextKey == null ? other$contextKey != null : !this$contextKey.equals(other$contextKey)) {
            return false;
        }
        String this$childId = this.getChildId();
        String other$childId = other.getChildId();
        return !(this$childId == null ? other$childId != null : !this$childId.equals(other$childId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindBlockChildid;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $bindex = this.getBindex();
        result = result * 59 + ($bindex == null ? 43 : ((Object)$bindex).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $projectId = this.getProjectId();
        result = result * 59 + ($projectId == null ? 43 : $projectId.hashCode());
        String $taskId = this.getTaskId();
        result = result * 59 + ($taskId == null ? 43 : $taskId.hashCode());
        String $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : $blockId.hashCode());
        String $contextKey = this.getContextKey();
        result = result * 59 + ($contextKey == null ? 43 : $contextKey.hashCode());
        String $childId = this.getChildId();
        result = result * 59 + ($childId == null ? 43 : $childId.hashCode());
        return result;
    }

    public String toString() {
        return "WindBlockChildid(id=" + this.getId() + ", projectId=" + this.getProjectId() + ", taskId=" + this.getTaskId() + ", blockId=" + this.getBlockId() + ", contextKey=" + this.getContextKey() + ", bindex=" + this.getBindex() + ", childId=" + this.getChildId() + ")";
    }

    public WindBlockChildid() {
    }

    public WindBlockChildid(String id, String projectId, String taskId, String blockId, String contextKey, Integer bindex, String childId) {
        this.id = id;
        this.projectId = projectId;
        this.taskId = taskId;
        this.blockId = blockId;
        this.contextKey = contextKey;
        this.bindex = bindex;
        this.childId = childId;
    }
}

