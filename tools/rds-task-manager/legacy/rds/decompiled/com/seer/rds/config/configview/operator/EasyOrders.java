/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.EasyOrder
 *  com.seer.rds.config.configview.operator.EasyOrders
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.EasyOrder;
import java.util.Collections;
import java.util.List;

public class EasyOrders {
    private Boolean enable = false;
    private List<EasyOrder> easyOrder = Collections.emptyList();

    public Boolean getEnable() {
        return this.enable;
    }

    public List<EasyOrder> getEasyOrder() {
        return this.easyOrder;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setEasyOrder(List<EasyOrder> easyOrder) {
        this.easyOrder = easyOrder;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EasyOrders)) {
            return false;
        }
        EasyOrders other = (EasyOrders)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        List this$easyOrder = this.getEasyOrder();
        List other$easyOrder = other.getEasyOrder();
        return !(this$easyOrder == null ? other$easyOrder != null : !((Object)this$easyOrder).equals(other$easyOrder));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EasyOrders;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        List $easyOrder = this.getEasyOrder();
        result = result * 59 + ($easyOrder == null ? 43 : ((Object)$easyOrder).hashCode());
        return result;
    }

    public String toString() {
        return "EasyOrders(enable=" + this.getEnable() + ", easyOrder=" + this.getEasyOrder() + ")";
    }
}

