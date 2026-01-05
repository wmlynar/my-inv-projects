/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindDataCache
 *  com.seer.rds.model.wind.WindDataCache$WindDataCacheBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindDataCache;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_winddatacache")
public class WindDataCache {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Lob
    @Column(nullable=true)
    private String data;

    public static WindDataCacheBuilder builder() {
        return new WindDataCacheBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getData() {
        return this.data;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setData(String data) {
        this.data = data;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDataCache)) {
            return false;
        }
        WindDataCache other = (WindDataCache)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$data = this.getData();
        String other$data = other.getData();
        return !(this$data == null ? other$data != null : !this$data.equals(other$data));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDataCache;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $data = this.getData();
        result = result * 59 + ($data == null ? 43 : $data.hashCode());
        return result;
    }

    public String toString() {
        return "WindDataCache(id=" + this.getId() + ", data=" + this.getData() + ")";
    }

    public WindDataCache() {
    }

    public WindDataCache(String id, String data) {
        this.id = id;
        this.data = data;
    }
}

