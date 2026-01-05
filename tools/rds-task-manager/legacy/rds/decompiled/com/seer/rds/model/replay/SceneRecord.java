/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.replay.SceneRecord
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Table
 */
package com.seer.rds.model.replay;

import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name="t_scene_record")
public class SceneRecord {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String sceneMd5;
    private Date createTime;

    public SceneRecord(String sceneMd5, Date createTime) {
        this.sceneMd5 = sceneMd5;
        this.createTime = createTime;
    }

    public Long getId() {
        return this.id;
    }

    public String getSceneMd5() {
        return this.sceneMd5;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setSceneMd5(String sceneMd5) {
        this.sceneMd5 = sceneMd5;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SceneRecord)) {
            return false;
        }
        SceneRecord other = (SceneRecord)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        String this$sceneMd5 = this.getSceneMd5();
        String other$sceneMd5 = other.getSceneMd5();
        if (this$sceneMd5 == null ? other$sceneMd5 != null : !this$sceneMd5.equals(other$sceneMd5)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        return !(this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SceneRecord;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        String $sceneMd5 = this.getSceneMd5();
        result = result * 59 + ($sceneMd5 == null ? 43 : $sceneMd5.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        return result;
    }

    public String toString() {
        return "SceneRecord(id=" + this.getId() + ", sceneMd5=" + this.getSceneMd5() + ", createTime=" + this.getCreateTime() + ")";
    }

    public SceneRecord() {
    }

    public SceneRecord(Long id, String sceneMd5, Date createTime) {
        this.id = id;
        this.sceneMd5 = sceneMd5;
        this.createTime = createTime;
    }
}

