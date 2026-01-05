/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.RobotItem
 *  com.seer.rds.model.stat.RobotItem$RobotItemBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.RobotItem;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_robotitem", indexes={@Index(name="idxRIUuid", columnList="uuid")})
public class RobotItem {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String uuid;
    private Date addedOn;
    @Column(nullable=false, columnDefinition="int default 0")
    private Integer del;
    private Date updateOn;

    public static RobotItemBuilder builder() {
        return new RobotItemBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getUuid() {
        return this.uuid;
    }

    public Date getAddedOn() {
        return this.addedOn;
    }

    public Integer getDel() {
        return this.del;
    }

    public Date getUpdateOn() {
        return this.updateOn;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setAddedOn(Date addedOn) {
        this.addedOn = addedOn;
    }

    public void setDel(Integer del) {
        this.del = del;
    }

    public void setUpdateOn(Date updateOn) {
        this.updateOn = updateOn;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RobotItem)) {
            return false;
        }
        RobotItem other = (RobotItem)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$del = this.getDel();
        Integer other$del = other.getDel();
        if (this$del == null ? other$del != null : !((Object)this$del).equals(other$del)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$uuid = this.getUuid();
        String other$uuid = other.getUuid();
        if (this$uuid == null ? other$uuid != null : !this$uuid.equals(other$uuid)) {
            return false;
        }
        Date this$addedOn = this.getAddedOn();
        Date other$addedOn = other.getAddedOn();
        if (this$addedOn == null ? other$addedOn != null : !((Object)this$addedOn).equals(other$addedOn)) {
            return false;
        }
        Date this$updateOn = this.getUpdateOn();
        Date other$updateOn = other.getUpdateOn();
        return !(this$updateOn == null ? other$updateOn != null : !((Object)this$updateOn).equals(other$updateOn));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RobotItem;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $del = this.getDel();
        result = result * 59 + ($del == null ? 43 : ((Object)$del).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        Date $addedOn = this.getAddedOn();
        result = result * 59 + ($addedOn == null ? 43 : ((Object)$addedOn).hashCode());
        Date $updateOn = this.getUpdateOn();
        result = result * 59 + ($updateOn == null ? 43 : ((Object)$updateOn).hashCode());
        return result;
    }

    public String toString() {
        return "RobotItem(id=" + this.getId() + ", uuid=" + this.getUuid() + ", addedOn=" + this.getAddedOn() + ", del=" + this.getDel() + ", updateOn=" + this.getUpdateOn() + ")";
    }

    public RobotItem() {
    }

    public RobotItem(String id, String uuid, Date addedOn, Integer del, Date updateOn) {
        this.id = id;
        this.uuid = uuid;
        this.addedOn = addedOn;
        this.del = del;
        this.updateOn = updateOn;
    }
}

