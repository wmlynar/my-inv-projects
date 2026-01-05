/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.Card
 */
package com.seer.rds.config.configview.operator;

import java.util.List;

public class Card {
    private String menuId = "";
    private List<String> workStations = null;
    private List<String> workTypes = null;
    private String menuItemBackground = "";
    private String menuItemTextColor = "";
    private String menuType = "text";
    private String route = "";
    private String label = "";

    public String getMenuId() {
        return this.menuId;
    }

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public String getMenuItemBackground() {
        return this.menuItemBackground;
    }

    public String getMenuItemTextColor() {
        return this.menuItemTextColor;
    }

    public String getMenuType() {
        return this.menuType;
    }

    public String getRoute() {
        return this.route;
    }

    public String getLabel() {
        return this.label;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setMenuItemBackground(String menuItemBackground) {
        this.menuItemBackground = menuItemBackground;
    }

    public void setMenuItemTextColor(String menuItemTextColor) {
        this.menuItemTextColor = menuItemTextColor;
    }

    public void setMenuType(String menuType) {
        this.menuType = menuType;
    }

    public void setRoute(String route) {
        this.route = route;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Card)) {
            return false;
        }
        Card other = (Card)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        List this$workStations = this.getWorkStations();
        List other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !((Object)this$workStations).equals(other$workStations)) {
            return false;
        }
        List this$workTypes = this.getWorkTypes();
        List other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !((Object)this$workTypes).equals(other$workTypes)) {
            return false;
        }
        String this$menuItemBackground = this.getMenuItemBackground();
        String other$menuItemBackground = other.getMenuItemBackground();
        if (this$menuItemBackground == null ? other$menuItemBackground != null : !this$menuItemBackground.equals(other$menuItemBackground)) {
            return false;
        }
        String this$menuItemTextColor = this.getMenuItemTextColor();
        String other$menuItemTextColor = other.getMenuItemTextColor();
        if (this$menuItemTextColor == null ? other$menuItemTextColor != null : !this$menuItemTextColor.equals(other$menuItemTextColor)) {
            return false;
        }
        String this$menuType = this.getMenuType();
        String other$menuType = other.getMenuType();
        if (this$menuType == null ? other$menuType != null : !this$menuType.equals(other$menuType)) {
            return false;
        }
        String this$route = this.getRoute();
        String other$route = other.getRoute();
        if (this$route == null ? other$route != null : !this$route.equals(other$route)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        return !(this$label == null ? other$label != null : !this$label.equals(other$label));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Card;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        String $menuItemBackground = this.getMenuItemBackground();
        result = result * 59 + ($menuItemBackground == null ? 43 : $menuItemBackground.hashCode());
        String $menuItemTextColor = this.getMenuItemTextColor();
        result = result * 59 + ($menuItemTextColor == null ? 43 : $menuItemTextColor.hashCode());
        String $menuType = this.getMenuType();
        result = result * 59 + ($menuType == null ? 43 : $menuType.hashCode());
        String $route = this.getRoute();
        result = result * 59 + ($route == null ? 43 : $route.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        return result;
    }

    public String toString() {
        return "Card(menuId=" + this.getMenuId() + ", workStations=" + this.getWorkStations() + ", workTypes=" + this.getWorkTypes() + ", menuItemBackground=" + this.getMenuItemBackground() + ", menuItemTextColor=" + this.getMenuItemTextColor() + ", menuType=" + this.getMenuType() + ", route=" + this.getRoute() + ", label=" + this.getLabel() + ")";
    }
}

