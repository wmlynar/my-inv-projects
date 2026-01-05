/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskRestrictions
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtaskrestrictions")
public class WindTaskRestrictions {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String strategy;
    private Integer repair;
    private Date repairTime;
    private Date strategyTime;

    public String getId() {
        return this.id;
    }

    public String getStrategy() {
        return this.strategy;
    }

    public Integer getRepair() {
        return this.repair;
    }

    public Date getRepairTime() {
        return this.repairTime;
    }

    public Date getStrategyTime() {
        return this.strategyTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setStrategy(String strategy) {
        this.strategy = strategy;
    }

    public void setRepair(Integer repair) {
        this.repair = repair;
    }

    public void setRepairTime(Date repairTime) {
        this.repairTime = repairTime;
    }

    public void setStrategyTime(Date strategyTime) {
        this.strategyTime = strategyTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskRestrictions)) {
            return false;
        }
        WindTaskRestrictions other = (WindTaskRestrictions)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$repair = this.getRepair();
        Integer other$repair = other.getRepair();
        if (this$repair == null ? other$repair != null : !((Object)this$repair).equals(other$repair)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$strategy = this.getStrategy();
        String other$strategy = other.getStrategy();
        if (this$strategy == null ? other$strategy != null : !this$strategy.equals(other$strategy)) {
            return false;
        }
        Date this$repairTime = this.getRepairTime();
        Date other$repairTime = other.getRepairTime();
        if (this$repairTime == null ? other$repairTime != null : !((Object)this$repairTime).equals(other$repairTime)) {
            return false;
        }
        Date this$strategyTime = this.getStrategyTime();
        Date other$strategyTime = other.getStrategyTime();
        return !(this$strategyTime == null ? other$strategyTime != null : !((Object)this$strategyTime).equals(other$strategyTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskRestrictions;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $repair = this.getRepair();
        result = result * 59 + ($repair == null ? 43 : ((Object)$repair).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $strategy = this.getStrategy();
        result = result * 59 + ($strategy == null ? 43 : $strategy.hashCode());
        Date $repairTime = this.getRepairTime();
        result = result * 59 + ($repairTime == null ? 43 : ((Object)$repairTime).hashCode());
        Date $strategyTime = this.getStrategyTime();
        result = result * 59 + ($strategyTime == null ? 43 : ((Object)$strategyTime).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskRestrictions(id=" + this.getId() + ", strategy=" + this.getStrategy() + ", repair=" + this.getRepair() + ", repairTime=" + this.getRepairTime() + ", strategyTime=" + this.getStrategyTime() + ")";
    }
}

