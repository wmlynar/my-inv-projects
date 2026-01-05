/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.EasyOrderExecuteCustom
 */
package com.seer.rds.config.configview.operator;

public class EasyOrderExecuteCustom {
    private String route = "";
    private String params = "";

    public String getRoute() {
        return this.route;
    }

    public String getParams() {
        return this.params;
    }

    public void setRoute(String route) {
        this.route = route;
    }

    public void setParams(String params) {
        this.params = params;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EasyOrderExecuteCustom)) {
            return false;
        }
        EasyOrderExecuteCustom other = (EasyOrderExecuteCustom)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$route = this.getRoute();
        String other$route = other.getRoute();
        if (this$route == null ? other$route != null : !this$route.equals(other$route)) {
            return false;
        }
        String this$params = this.getParams();
        String other$params = other.getParams();
        return !(this$params == null ? other$params != null : !this$params.equals(other$params));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EasyOrderExecuteCustom;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $route = this.getRoute();
        result = result * 59 + ($route == null ? 43 : $route.hashCode());
        String $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : $params.hashCode());
        return result;
    }

    public String toString() {
        return "EasyOrderExecuteCustom(route=" + this.getRoute() + ", params=" + this.getParams() + ")";
    }
}

