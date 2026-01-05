/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.StatAgvLoadedTime
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.stat;

import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_statagvloadedtime", indexes={@Index(name="agvIdIdx", columnList="agvId")})
public class StatAgvLoadedTime {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String agvId;
    private BigDecimal loadedTime;
    private Date updateTime;

    public StatAgvLoadedTime() {
    }

    public StatAgvLoadedTime(String agvId, BigDecimal loadedTime, Date updateTime) {
        this.agvId = agvId;
        this.loadedTime = loadedTime;
        this.updateTime = updateTime;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public BigDecimal getLoadedTime() {
        return this.loadedTime;
    }

    public void setLoadedTime(BigDecimal loadedTime) {
        this.loadedTime = loadedTime;
    }

    public Date getUpdateTime() {
        return this.updateTime;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }
}

