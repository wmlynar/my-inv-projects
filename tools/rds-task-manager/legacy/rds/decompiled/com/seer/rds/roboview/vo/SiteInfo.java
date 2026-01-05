/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.vo.BinPoseInfo
 *  com.seer.rds.roboview.vo.SiteInfo
 */
package com.seer.rds.roboview.vo;

import com.seer.rds.roboview.vo.BinPoseInfo;
import java.util.List;

public class SiteInfo {
    private String storage_id;
    private String label;
    private Boolean storage_shelter;
    private String storage_group;
    private List<Integer> storage_shape;
    private Boolean storage_occupied;
    private Integer layers;
    private List<BinPoseInfo> bin_pose;
    private Boolean storage_in;
    private Boolean storage_out;
    private String product_type;
    private String time_stamp;

    public String getStorage_id() {
        return this.storage_id;
    }

    public String getLabel() {
        return this.label;
    }

    public Boolean getStorage_shelter() {
        return this.storage_shelter;
    }

    public String getStorage_group() {
        return this.storage_group;
    }

    public List<Integer> getStorage_shape() {
        return this.storage_shape;
    }

    public Boolean getStorage_occupied() {
        return this.storage_occupied;
    }

    public Integer getLayers() {
        return this.layers;
    }

    public List<BinPoseInfo> getBin_pose() {
        return this.bin_pose;
    }

    public Boolean getStorage_in() {
        return this.storage_in;
    }

    public Boolean getStorage_out() {
        return this.storage_out;
    }

    public String getProduct_type() {
        return this.product_type;
    }

    public String getTime_stamp() {
        return this.time_stamp;
    }

    public void setStorage_id(String storage_id) {
        this.storage_id = storage_id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setStorage_shelter(Boolean storage_shelter) {
        this.storage_shelter = storage_shelter;
    }

    public void setStorage_group(String storage_group) {
        this.storage_group = storage_group;
    }

    public void setStorage_shape(List<Integer> storage_shape) {
        this.storage_shape = storage_shape;
    }

    public void setStorage_occupied(Boolean storage_occupied) {
        this.storage_occupied = storage_occupied;
    }

    public void setLayers(Integer layers) {
        this.layers = layers;
    }

    public void setBin_pose(List<BinPoseInfo> bin_pose) {
        this.bin_pose = bin_pose;
    }

    public void setStorage_in(Boolean storage_in) {
        this.storage_in = storage_in;
    }

    public void setStorage_out(Boolean storage_out) {
        this.storage_out = storage_out;
    }

    public void setProduct_type(String product_type) {
        this.product_type = product_type;
    }

    public void setTime_stamp(String time_stamp) {
        this.time_stamp = time_stamp;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SiteInfo)) {
            return false;
        }
        SiteInfo other = (SiteInfo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$storage_shelter = this.getStorage_shelter();
        Boolean other$storage_shelter = other.getStorage_shelter();
        if (this$storage_shelter == null ? other$storage_shelter != null : !((Object)this$storage_shelter).equals(other$storage_shelter)) {
            return false;
        }
        Boolean this$storage_occupied = this.getStorage_occupied();
        Boolean other$storage_occupied = other.getStorage_occupied();
        if (this$storage_occupied == null ? other$storage_occupied != null : !((Object)this$storage_occupied).equals(other$storage_occupied)) {
            return false;
        }
        Integer this$layers = this.getLayers();
        Integer other$layers = other.getLayers();
        if (this$layers == null ? other$layers != null : !((Object)this$layers).equals(other$layers)) {
            return false;
        }
        Boolean this$storage_in = this.getStorage_in();
        Boolean other$storage_in = other.getStorage_in();
        if (this$storage_in == null ? other$storage_in != null : !((Object)this$storage_in).equals(other$storage_in)) {
            return false;
        }
        Boolean this$storage_out = this.getStorage_out();
        Boolean other$storage_out = other.getStorage_out();
        if (this$storage_out == null ? other$storage_out != null : !((Object)this$storage_out).equals(other$storage_out)) {
            return false;
        }
        String this$storage_id = this.getStorage_id();
        String other$storage_id = other.getStorage_id();
        if (this$storage_id == null ? other$storage_id != null : !this$storage_id.equals(other$storage_id)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$storage_group = this.getStorage_group();
        String other$storage_group = other.getStorage_group();
        if (this$storage_group == null ? other$storage_group != null : !this$storage_group.equals(other$storage_group)) {
            return false;
        }
        List this$storage_shape = this.getStorage_shape();
        List other$storage_shape = other.getStorage_shape();
        if (this$storage_shape == null ? other$storage_shape != null : !((Object)this$storage_shape).equals(other$storage_shape)) {
            return false;
        }
        List this$bin_pose = this.getBin_pose();
        List other$bin_pose = other.getBin_pose();
        if (this$bin_pose == null ? other$bin_pose != null : !((Object)this$bin_pose).equals(other$bin_pose)) {
            return false;
        }
        String this$product_type = this.getProduct_type();
        String other$product_type = other.getProduct_type();
        if (this$product_type == null ? other$product_type != null : !this$product_type.equals(other$product_type)) {
            return false;
        }
        String this$time_stamp = this.getTime_stamp();
        String other$time_stamp = other.getTime_stamp();
        return !(this$time_stamp == null ? other$time_stamp != null : !this$time_stamp.equals(other$time_stamp));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SiteInfo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $storage_shelter = this.getStorage_shelter();
        result = result * 59 + ($storage_shelter == null ? 43 : ((Object)$storage_shelter).hashCode());
        Boolean $storage_occupied = this.getStorage_occupied();
        result = result * 59 + ($storage_occupied == null ? 43 : ((Object)$storage_occupied).hashCode());
        Integer $layers = this.getLayers();
        result = result * 59 + ($layers == null ? 43 : ((Object)$layers).hashCode());
        Boolean $storage_in = this.getStorage_in();
        result = result * 59 + ($storage_in == null ? 43 : ((Object)$storage_in).hashCode());
        Boolean $storage_out = this.getStorage_out();
        result = result * 59 + ($storage_out == null ? 43 : ((Object)$storage_out).hashCode());
        String $storage_id = this.getStorage_id();
        result = result * 59 + ($storage_id == null ? 43 : $storage_id.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $storage_group = this.getStorage_group();
        result = result * 59 + ($storage_group == null ? 43 : $storage_group.hashCode());
        List $storage_shape = this.getStorage_shape();
        result = result * 59 + ($storage_shape == null ? 43 : ((Object)$storage_shape).hashCode());
        List $bin_pose = this.getBin_pose();
        result = result * 59 + ($bin_pose == null ? 43 : ((Object)$bin_pose).hashCode());
        String $product_type = this.getProduct_type();
        result = result * 59 + ($product_type == null ? 43 : $product_type.hashCode());
        String $time_stamp = this.getTime_stamp();
        result = result * 59 + ($time_stamp == null ? 43 : $time_stamp.hashCode());
        return result;
    }

    public String toString() {
        return "SiteInfo(storage_id=" + this.getStorage_id() + ", label=" + this.getLabel() + ", storage_shelter=" + this.getStorage_shelter() + ", storage_group=" + this.getStorage_group() + ", storage_shape=" + this.getStorage_shape() + ", storage_occupied=" + this.getStorage_occupied() + ", layers=" + this.getLayers() + ", bin_pose=" + this.getBin_pose() + ", storage_in=" + this.getStorage_in() + ", storage_out=" + this.getStorage_out() + ", product_type=" + this.getProduct_type() + ", time_stamp=" + this.getTime_stamp() + ")";
    }
}

