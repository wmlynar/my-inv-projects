/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.PathOccupied
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import io.swagger.annotations.ApiModel;
import java.math.BigDecimal;

@ApiModel(value="\u5360\u7528path array")
public class PathOccupied {
    private String end_id;
    private BigDecimal end_percentage;
    private String source_id;
    private BigDecimal start_percentage;

    public String getEnd_id() {
        return this.end_id;
    }

    public BigDecimal getEnd_percentage() {
        return this.end_percentage;
    }

    public String getSource_id() {
        return this.source_id;
    }

    public BigDecimal getStart_percentage() {
        return this.start_percentage;
    }

    public void setEnd_id(String end_id) {
        this.end_id = end_id;
    }

    public void setEnd_percentage(BigDecimal end_percentage) {
        this.end_percentage = end_percentage;
    }

    public void setSource_id(String source_id) {
        this.source_id = source_id;
    }

    public void setStart_percentage(BigDecimal start_percentage) {
        this.start_percentage = start_percentage;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PathOccupied)) {
            return false;
        }
        PathOccupied other = (PathOccupied)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$end_id = this.getEnd_id();
        String other$end_id = other.getEnd_id();
        if (this$end_id == null ? other$end_id != null : !this$end_id.equals(other$end_id)) {
            return false;
        }
        BigDecimal this$end_percentage = this.getEnd_percentage();
        BigDecimal other$end_percentage = other.getEnd_percentage();
        if (this$end_percentage == null ? other$end_percentage != null : !((Object)this$end_percentage).equals(other$end_percentage)) {
            return false;
        }
        String this$source_id = this.getSource_id();
        String other$source_id = other.getSource_id();
        if (this$source_id == null ? other$source_id != null : !this$source_id.equals(other$source_id)) {
            return false;
        }
        BigDecimal this$start_percentage = this.getStart_percentage();
        BigDecimal other$start_percentage = other.getStart_percentage();
        return !(this$start_percentage == null ? other$start_percentage != null : !((Object)this$start_percentage).equals(other$start_percentage));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PathOccupied;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $end_id = this.getEnd_id();
        result = result * 59 + ($end_id == null ? 43 : $end_id.hashCode());
        BigDecimal $end_percentage = this.getEnd_percentage();
        result = result * 59 + ($end_percentage == null ? 43 : ((Object)$end_percentage).hashCode());
        String $source_id = this.getSource_id();
        result = result * 59 + ($source_id == null ? 43 : $source_id.hashCode());
        BigDecimal $start_percentage = this.getStart_percentage();
        result = result * 59 + ($start_percentage == null ? 43 : ((Object)$start_percentage).hashCode());
        return result;
    }

    public String toString() {
        return "PathOccupied(end_id=" + this.getEnd_id() + ", end_percentage=" + this.getEnd_percentage() + ", source_id=" + this.getSource_id() + ", start_percentage=" + this.getStart_percentage() + ")";
    }

    public PathOccupied(String end_id, BigDecimal end_percentage, String source_id, BigDecimal start_percentage) {
        this.end_id = end_id;
        this.end_percentage = end_percentage;
        this.source_id = source_id;
        this.start_percentage = start_percentage;
    }

    public PathOccupied() {
    }
}

