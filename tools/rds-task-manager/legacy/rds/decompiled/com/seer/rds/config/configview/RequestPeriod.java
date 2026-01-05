/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.RequestPeriod
 */
package com.seer.rds.config.configview;

public class RequestPeriod {
    private Boolean ifEnableQueryOrdersCache = true;
    private int queryOrdersCachePeriod = 2;

    public Boolean getIfEnableQueryOrdersCache() {
        return this.ifEnableQueryOrdersCache;
    }

    public int getQueryOrdersCachePeriod() {
        return this.queryOrdersCachePeriod;
    }

    public void setIfEnableQueryOrdersCache(Boolean ifEnableQueryOrdersCache) {
        this.ifEnableQueryOrdersCache = ifEnableQueryOrdersCache;
    }

    public void setQueryOrdersCachePeriod(int queryOrdersCachePeriod) {
        this.queryOrdersCachePeriod = queryOrdersCachePeriod;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RequestPeriod)) {
            return false;
        }
        RequestPeriod other = (RequestPeriod)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getQueryOrdersCachePeriod() != other.getQueryOrdersCachePeriod()) {
            return false;
        }
        Boolean this$ifEnableQueryOrdersCache = this.getIfEnableQueryOrdersCache();
        Boolean other$ifEnableQueryOrdersCache = other.getIfEnableQueryOrdersCache();
        return !(this$ifEnableQueryOrdersCache == null ? other$ifEnableQueryOrdersCache != null : !((Object)this$ifEnableQueryOrdersCache).equals(other$ifEnableQueryOrdersCache));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RequestPeriod;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getQueryOrdersCachePeriod();
        Boolean $ifEnableQueryOrdersCache = this.getIfEnableQueryOrdersCache();
        result = result * 59 + ($ifEnableQueryOrdersCache == null ? 43 : ((Object)$ifEnableQueryOrdersCache).hashCode());
        return result;
    }

    public String toString() {
        return "RequestPeriod(ifEnableQueryOrdersCache=" + this.getIfEnableQueryOrdersCache() + ", queryOrdersCachePeriod=" + this.getQueryOrdersCachePeriod() + ")";
    }
}

