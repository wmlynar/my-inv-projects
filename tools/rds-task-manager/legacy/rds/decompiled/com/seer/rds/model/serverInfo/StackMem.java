/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.StackMem
 *  com.seer.rds.model.serverInfo.StackMem$StackMemBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.serverInfo;

import com.seer.rds.model.serverInfo.StackMem;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_stackmemoryrecord", indexes={@Index(name="recordedOnIndex", columnList="recordedOn"), @Index(name="hourIndex", columnList="hour")})
public class StackMem {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    @Column(nullable=false)
    private String memoryPercent;
    @Column(nullable=false)
    private String usedMemorystr;
    @Column(nullable=false)
    private String totalStackMemory;
    @Column(nullable=false)
    private Integer hour;
    @Column(nullable=false)
    private Date recordedOn;

    public StackMem(Date recordedOn, Integer hour, Long memoryUsage, String usedMemorystr, String totalStackMemory) {
        this.recordedOn = recordedOn;
        this.hour = hour;
        this.memoryPercent = this.memoryPercent;
        this.usedMemorystr = usedMemorystr;
        this.totalStackMemory = totalStackMemory;
    }

    public static StackMemBuilder builder() {
        return new StackMemBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getMemoryPercent() {
        return this.memoryPercent;
    }

    public String getUsedMemorystr() {
        return this.usedMemorystr;
    }

    public String getTotalStackMemory() {
        return this.totalStackMemory;
    }

    public Integer getHour() {
        return this.hour;
    }

    public Date getRecordedOn() {
        return this.recordedOn;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setMemoryPercent(String memoryPercent) {
        this.memoryPercent = memoryPercent;
    }

    public void setUsedMemorystr(String usedMemorystr) {
        this.usedMemorystr = usedMemorystr;
    }

    public void setTotalStackMemory(String totalStackMemory) {
        this.totalStackMemory = totalStackMemory;
    }

    public void setHour(Integer hour) {
        this.hour = hour;
    }

    public void setRecordedOn(Date recordedOn) {
        this.recordedOn = recordedOn;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StackMem)) {
            return false;
        }
        StackMem other = (StackMem)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Integer this$hour = this.getHour();
        Integer other$hour = other.getHour();
        if (this$hour == null ? other$hour != null : !((Object)this$hour).equals(other$hour)) {
            return false;
        }
        String this$memoryPercent = this.getMemoryPercent();
        String other$memoryPercent = other.getMemoryPercent();
        if (this$memoryPercent == null ? other$memoryPercent != null : !this$memoryPercent.equals(other$memoryPercent)) {
            return false;
        }
        String this$usedMemorystr = this.getUsedMemorystr();
        String other$usedMemorystr = other.getUsedMemorystr();
        if (this$usedMemorystr == null ? other$usedMemorystr != null : !this$usedMemorystr.equals(other$usedMemorystr)) {
            return false;
        }
        String this$totalStackMemory = this.getTotalStackMemory();
        String other$totalStackMemory = other.getTotalStackMemory();
        if (this$totalStackMemory == null ? other$totalStackMemory != null : !this$totalStackMemory.equals(other$totalStackMemory)) {
            return false;
        }
        Date this$recordedOn = this.getRecordedOn();
        Date other$recordedOn = other.getRecordedOn();
        return !(this$recordedOn == null ? other$recordedOn != null : !((Object)this$recordedOn).equals(other$recordedOn));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StackMem;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Integer $hour = this.getHour();
        result = result * 59 + ($hour == null ? 43 : ((Object)$hour).hashCode());
        String $memoryPercent = this.getMemoryPercent();
        result = result * 59 + ($memoryPercent == null ? 43 : $memoryPercent.hashCode());
        String $usedMemorystr = this.getUsedMemorystr();
        result = result * 59 + ($usedMemorystr == null ? 43 : $usedMemorystr.hashCode());
        String $totalStackMemory = this.getTotalStackMemory();
        result = result * 59 + ($totalStackMemory == null ? 43 : $totalStackMemory.hashCode());
        Date $recordedOn = this.getRecordedOn();
        result = result * 59 + ($recordedOn == null ? 43 : ((Object)$recordedOn).hashCode());
        return result;
    }

    public String toString() {
        return "StackMem(id=" + this.getId() + ", memoryPercent=" + this.getMemoryPercent() + ", usedMemorystr=" + this.getUsedMemorystr() + ", totalStackMemory=" + this.getTotalStackMemory() + ", hour=" + this.getHour() + ", recordedOn=" + this.getRecordedOn() + ")";
    }

    public StackMem() {
    }

    public StackMem(Long id, String memoryPercent, String usedMemorystr, String totalStackMemory, Integer hour, Date recordedOn) {
        this.id = id;
        this.memoryPercent = memoryPercent;
        this.usedMemorystr = usedMemorystr;
        this.totalStackMemory = totalStackMemory;
        this.hour = hour;
        this.recordedOn = recordedOn;
    }

    public StackMem withId(Long id) {
        return this.id == id ? this : new StackMem(id, this.memoryPercent, this.usedMemorystr, this.totalStackMemory, this.hour, this.recordedOn);
    }

    public StackMem withMemoryPercent(String memoryPercent) {
        return this.memoryPercent == memoryPercent ? this : new StackMem(this.id, memoryPercent, this.usedMemorystr, this.totalStackMemory, this.hour, this.recordedOn);
    }

    public StackMem withUsedMemorystr(String usedMemorystr) {
        return this.usedMemorystr == usedMemorystr ? this : new StackMem(this.id, this.memoryPercent, usedMemorystr, this.totalStackMemory, this.hour, this.recordedOn);
    }

    public StackMem withTotalStackMemory(String totalStackMemory) {
        return this.totalStackMemory == totalStackMemory ? this : new StackMem(this.id, this.memoryPercent, this.usedMemorystr, totalStackMemory, this.hour, this.recordedOn);
    }

    public StackMem withHour(Integer hour) {
        return this.hour == hour ? this : new StackMem(this.id, this.memoryPercent, this.usedMemorystr, this.totalStackMemory, hour, this.recordedOn);
    }

    public StackMem withRecordedOn(Date recordedOn) {
        return this.recordedOn == recordedOn ? this : new StackMem(this.id, this.memoryPercent, this.usedMemorystr, this.totalStackMemory, this.hour, recordedOn);
    }
}

