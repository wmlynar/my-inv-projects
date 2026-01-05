/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.AreaResourcesOccupiedVo
 *  com.seer.rds.vo.core.AvoidObsAreaOccupiedVo
 *  com.seer.rds.vo.core.PathOccupied
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.core.AvoidObsAreaOccupiedVo;
import com.seer.rds.vo.core.PathOccupied;
import io.swagger.annotations.ApiModel;
import java.util.List;

@ApiModel(value="\u6bcf\u4e2a\u533a\u57df\u5185\u673a\u5668\u4eba\u5360\u7528\u8d44\u6e90")
public class AreaResourcesOccupiedVo {
    private String area_name;
    private AvoidObsAreaOccupiedVo avoidObs_area_occupied;
    private List<Object> blocks_occupied;
    private List<PathOccupied> path_occupied;

    public String getArea_name() {
        return this.area_name;
    }

    public AvoidObsAreaOccupiedVo getAvoidObs_area_occupied() {
        return this.avoidObs_area_occupied;
    }

    public List<Object> getBlocks_occupied() {
        return this.blocks_occupied;
    }

    public List<PathOccupied> getPath_occupied() {
        return this.path_occupied;
    }

    public void setArea_name(String area_name) {
        this.area_name = area_name;
    }

    public void setAvoidObs_area_occupied(AvoidObsAreaOccupiedVo avoidObs_area_occupied) {
        this.avoidObs_area_occupied = avoidObs_area_occupied;
    }

    public void setBlocks_occupied(List<Object> blocks_occupied) {
        this.blocks_occupied = blocks_occupied;
    }

    public void setPath_occupied(List<PathOccupied> path_occupied) {
        this.path_occupied = path_occupied;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AreaResourcesOccupiedVo)) {
            return false;
        }
        AreaResourcesOccupiedVo other = (AreaResourcesOccupiedVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$area_name = this.getArea_name();
        String other$area_name = other.getArea_name();
        if (this$area_name == null ? other$area_name != null : !this$area_name.equals(other$area_name)) {
            return false;
        }
        AvoidObsAreaOccupiedVo this$avoidObs_area_occupied = this.getAvoidObs_area_occupied();
        AvoidObsAreaOccupiedVo other$avoidObs_area_occupied = other.getAvoidObs_area_occupied();
        if (this$avoidObs_area_occupied == null ? other$avoidObs_area_occupied != null : !this$avoidObs_area_occupied.equals(other$avoidObs_area_occupied)) {
            return false;
        }
        List this$blocks_occupied = this.getBlocks_occupied();
        List other$blocks_occupied = other.getBlocks_occupied();
        if (this$blocks_occupied == null ? other$blocks_occupied != null : !((Object)this$blocks_occupied).equals(other$blocks_occupied)) {
            return false;
        }
        List this$path_occupied = this.getPath_occupied();
        List other$path_occupied = other.getPath_occupied();
        return !(this$path_occupied == null ? other$path_occupied != null : !((Object)this$path_occupied).equals(other$path_occupied));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AreaResourcesOccupiedVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $area_name = this.getArea_name();
        result = result * 59 + ($area_name == null ? 43 : $area_name.hashCode());
        AvoidObsAreaOccupiedVo $avoidObs_area_occupied = this.getAvoidObs_area_occupied();
        result = result * 59 + ($avoidObs_area_occupied == null ? 43 : $avoidObs_area_occupied.hashCode());
        List $blocks_occupied = this.getBlocks_occupied();
        result = result * 59 + ($blocks_occupied == null ? 43 : ((Object)$blocks_occupied).hashCode());
        List $path_occupied = this.getPath_occupied();
        result = result * 59 + ($path_occupied == null ? 43 : ((Object)$path_occupied).hashCode());
        return result;
    }

    public String toString() {
        return "AreaResourcesOccupiedVo(area_name=" + this.getArea_name() + ", avoidObs_area_occupied=" + this.getAvoidObs_area_occupied() + ", blocks_occupied=" + this.getBlocks_occupied() + ", path_occupied=" + this.getPath_occupied() + ")";
    }

    public AreaResourcesOccupiedVo(String area_name, AvoidObsAreaOccupiedVo avoidObs_area_occupied, List<Object> blocks_occupied, List<PathOccupied> path_occupied) {
        this.area_name = area_name;
        this.avoidObs_area_occupied = avoidObs_area_occupied;
        this.blocks_occupied = blocks_occupied;
        this.path_occupied = path_occupied;
    }

    public AreaResourcesOccupiedVo() {
    }
}

