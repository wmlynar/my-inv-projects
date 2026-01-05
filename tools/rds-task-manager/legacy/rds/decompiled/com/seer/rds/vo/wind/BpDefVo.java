/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.wind.BpDefVo
 */
package com.seer.rds.vo.wind;

import com.alibaba.fastjson.JSONObject;
import java.util.Arrays;
import java.util.List;

public class BpDefVo {
    private String label;
    private int order;
    private List<JSONObject> blocks;
    public static final List<String> LABELS = Arrays.asList("wind.labels.script", "wind.labels.http", "wind.labels.task", "wind.labels.programFlow", "wind.labels.others", "wind.labels.workSite", "wind.labels.simulation", "wind.labels.core", "wind.labels.device");

    public String getLabel() {
        return this.label;
    }

    public int getOrder() {
        return this.order;
    }

    public List<JSONObject> getBlocks() {
        return this.blocks;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setOrder(int order) {
        this.order = order;
    }

    public void setBlocks(List<JSONObject> blocks) {
        this.blocks = blocks;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BpDefVo)) {
            return false;
        }
        BpDefVo other = (BpDefVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getOrder() != other.getOrder()) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        List this$blocks = this.getBlocks();
        List other$blocks = other.getBlocks();
        return !(this$blocks == null ? other$blocks != null : !((Object)this$blocks).equals(other$blocks));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BpDefVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getOrder();
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        List $blocks = this.getBlocks();
        result = result * 59 + ($blocks == null ? 43 : ((Object)$blocks).hashCode());
        return result;
    }

    public String toString() {
        return "BpDefVo(label=" + this.getLabel() + ", order=" + this.getOrder() + ", blocks=" + this.getBlocks() + ")";
    }
}

