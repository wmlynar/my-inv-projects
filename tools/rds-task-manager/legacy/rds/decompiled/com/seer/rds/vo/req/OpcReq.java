/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.OpcReq
 */
package com.seer.rds.vo.req;

import java.io.Serializable;

public class OpcReq
implements Serializable {
    private Integer namespaceIndex;
    private String identifier;
    private Integer value;
    private Integer subscriptionId;

    public Integer getNamespaceIndex() {
        return this.namespaceIndex;
    }

    public String getIdentifier() {
        return this.identifier;
    }

    public Integer getValue() {
        return this.value;
    }

    public Integer getSubscriptionId() {
        return this.subscriptionId;
    }

    public void setNamespaceIndex(Integer namespaceIndex) {
        this.namespaceIndex = namespaceIndex;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public void setValue(Integer value) {
        this.value = value;
    }

    public void setSubscriptionId(Integer subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OpcReq)) {
            return false;
        }
        OpcReq other = (OpcReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$namespaceIndex = this.getNamespaceIndex();
        Integer other$namespaceIndex = other.getNamespaceIndex();
        if (this$namespaceIndex == null ? other$namespaceIndex != null : !((Object)this$namespaceIndex).equals(other$namespaceIndex)) {
            return false;
        }
        Integer this$value = this.getValue();
        Integer other$value = other.getValue();
        if (this$value == null ? other$value != null : !((Object)this$value).equals(other$value)) {
            return false;
        }
        Integer this$subscriptionId = this.getSubscriptionId();
        Integer other$subscriptionId = other.getSubscriptionId();
        if (this$subscriptionId == null ? other$subscriptionId != null : !((Object)this$subscriptionId).equals(other$subscriptionId)) {
            return false;
        }
        String this$identifier = this.getIdentifier();
        String other$identifier = other.getIdentifier();
        return !(this$identifier == null ? other$identifier != null : !this$identifier.equals(other$identifier));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OpcReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $namespaceIndex = this.getNamespaceIndex();
        result = result * 59 + ($namespaceIndex == null ? 43 : ((Object)$namespaceIndex).hashCode());
        Integer $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : ((Object)$value).hashCode());
        Integer $subscriptionId = this.getSubscriptionId();
        result = result * 59 + ($subscriptionId == null ? 43 : ((Object)$subscriptionId).hashCode());
        String $identifier = this.getIdentifier();
        result = result * 59 + ($identifier == null ? 43 : $identifier.hashCode());
        return result;
    }

    public String toString() {
        return "OpcReq(namespaceIndex=" + this.getNamespaceIndex() + ", identifier=" + this.getIdentifier() + ", value=" + this.getValue() + ", subscriptionId=" + this.getSubscriptionId() + ")";
    }
}

