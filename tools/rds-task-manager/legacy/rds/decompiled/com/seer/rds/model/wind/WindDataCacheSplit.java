/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindDataCacheSplit
 *  com.seer.rds.model.wind.WindDataCacheSplit$WindDataCacheSplitBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindDataCacheSplit;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_winddatacachesplit", indexes={@Index(name="dataKeyIndex", columnList="dataKey")})
public class WindDataCacheSplit {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Lob
    @Column(nullable=false)
    private String dataKey;
    @Lob
    private String dataValue;
    private Date updatedOn;
    @Column(nullable=false, columnDefinition="INT default 0")
    private Integer keep = 0;

    public WindDataCacheSplit(String dataKey, String dataValue, Date updatedOn) {
        this.dataKey = dataKey;
        this.dataValue = dataValue;
        this.updatedOn = updatedOn;
    }

    public WindDataCacheSplit(String dataKey, String dataValue, Date updatedOn, Integer keep) {
        this.dataKey = dataKey;
        this.dataValue = dataValue;
        this.updatedOn = updatedOn;
        this.keep = keep;
    }

    public static WindDataCacheSplitBuilder builder() {
        return new WindDataCacheSplitBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getDataKey() {
        return this.dataKey;
    }

    public String getDataValue() {
        return this.dataValue;
    }

    public Date getUpdatedOn() {
        return this.updatedOn;
    }

    public Integer getKeep() {
        return this.keep;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setDataKey(String dataKey) {
        this.dataKey = dataKey;
    }

    public void setDataValue(String dataValue) {
        this.dataValue = dataValue;
    }

    public void setUpdatedOn(Date updatedOn) {
        this.updatedOn = updatedOn;
    }

    public void setKeep(Integer keep) {
        this.keep = keep;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDataCacheSplit)) {
            return false;
        }
        WindDataCacheSplit other = (WindDataCacheSplit)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$keep = this.getKeep();
        Integer other$keep = other.getKeep();
        if (this$keep == null ? other$keep != null : !((Object)this$keep).equals(other$keep)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$dataKey = this.getDataKey();
        String other$dataKey = other.getDataKey();
        if (this$dataKey == null ? other$dataKey != null : !this$dataKey.equals(other$dataKey)) {
            return false;
        }
        String this$dataValue = this.getDataValue();
        String other$dataValue = other.getDataValue();
        if (this$dataValue == null ? other$dataValue != null : !this$dataValue.equals(other$dataValue)) {
            return false;
        }
        Date this$updatedOn = this.getUpdatedOn();
        Date other$updatedOn = other.getUpdatedOn();
        return !(this$updatedOn == null ? other$updatedOn != null : !((Object)this$updatedOn).equals(other$updatedOn));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDataCacheSplit;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $keep = this.getKeep();
        result = result * 59 + ($keep == null ? 43 : ((Object)$keep).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $dataKey = this.getDataKey();
        result = result * 59 + ($dataKey == null ? 43 : $dataKey.hashCode());
        String $dataValue = this.getDataValue();
        result = result * 59 + ($dataValue == null ? 43 : $dataValue.hashCode());
        Date $updatedOn = this.getUpdatedOn();
        result = result * 59 + ($updatedOn == null ? 43 : ((Object)$updatedOn).hashCode());
        return result;
    }

    public String toString() {
        return "WindDataCacheSplit(id=" + this.getId() + ", dataKey=" + this.getDataKey() + ", dataValue=" + this.getDataValue() + ", updatedOn=" + this.getUpdatedOn() + ", keep=" + this.getKeep() + ")";
    }

    public WindDataCacheSplit() {
    }

    public WindDataCacheSplit(String id, String dataKey, String dataValue, Date updatedOn, Integer keep) {
        this.id = id;
        this.dataKey = dataKey;
        this.dataValue = dataValue;
        this.updatedOn = updatedOn;
        this.keep = keep;
    }

    public WindDataCacheSplit withId(String id) {
        return this.id == id ? this : new WindDataCacheSplit(id, this.dataKey, this.dataValue, this.updatedOn, this.keep);
    }

    public WindDataCacheSplit withDataKey(String dataKey) {
        return this.dataKey == dataKey ? this : new WindDataCacheSplit(this.id, dataKey, this.dataValue, this.updatedOn, this.keep);
    }

    public WindDataCacheSplit withDataValue(String dataValue) {
        return this.dataValue == dataValue ? this : new WindDataCacheSplit(this.id, this.dataKey, dataValue, this.updatedOn, this.keep);
    }

    public WindDataCacheSplit withUpdatedOn(Date updatedOn) {
        return this.updatedOn == updatedOn ? this : new WindDataCacheSplit(this.id, this.dataKey, this.dataValue, updatedOn, this.keep);
    }

    public WindDataCacheSplit withKeep(Integer keep) {
        return this.keep == keep ? this : new WindDataCacheSplit(this.id, this.dataKey, this.dataValue, this.updatedOn, keep);
    }
}

