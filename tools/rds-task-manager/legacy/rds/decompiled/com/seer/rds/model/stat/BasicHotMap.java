/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.BasicHotMap
 *  com.seer.rds.model.stat.BasicHotMap$BasicHotMapBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.stat;

import com.seer.rds.model.stat.BasicHotMap;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_basichotmap")
public class BasicHotMap {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;

    public static BasicHotMapBuilder builder() {
        return new BasicHotMapBuilder();
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BasicHotMap)) {
            return false;
        }
        BasicHotMap other = (BasicHotMap)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        return !(this$id == null ? other$id != null : !this$id.equals(other$id));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BasicHotMap;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        return result;
    }

    public String toString() {
        return "BasicHotMap(id=" + this.getId() + ")";
    }

    public BasicHotMap() {
    }

    public BasicHotMap(String id) {
        this.id = id;
    }
}

