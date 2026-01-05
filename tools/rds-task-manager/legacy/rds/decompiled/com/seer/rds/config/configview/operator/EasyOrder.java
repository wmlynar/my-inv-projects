/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.EasyOrder
 *  com.seer.rds.config.configview.operator.EasyOrderExecuteCustom
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.EasyOrderExecuteCustom;
import java.util.List;

public class EasyOrder {
    private String menuId = "";
    private String label = "";
    private String menuItemBackground = "";
    private String menuItemRunBackground = "";
    private Integer fontSize = 12;
    private String menuItemTextColor = "";
    private List<String> workTypes = null;
    private List<String> workStations = null;
    private String layout = "";
    private String taskLabel = "";
    private EasyOrderExecuteCustom orderExecute = null;
    private EasyOrderExecuteCustom callBackExecute = null;

    public String getMenuId() {
        return this.menuId;
    }

    public String getLabel() {
        return this.label;
    }

    public String getMenuItemBackground() {
        return this.menuItemBackground;
    }

    public String getMenuItemRunBackground() {
        return this.menuItemRunBackground;
    }

    public Integer getFontSize() {
        return this.fontSize;
    }

    public String getMenuItemTextColor() {
        return this.menuItemTextColor;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public String getLayout() {
        return this.layout;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public EasyOrderExecuteCustom getOrderExecute() {
        return this.orderExecute;
    }

    public EasyOrderExecuteCustom getCallBackExecute() {
        return this.callBackExecute;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setMenuItemBackground(String menuItemBackground) {
        this.menuItemBackground = menuItemBackground;
    }

    public void setMenuItemRunBackground(String menuItemRunBackground) {
        this.menuItemRunBackground = menuItemRunBackground;
    }

    public void setFontSize(Integer fontSize) {
        this.fontSize = fontSize;
    }

    public void setMenuItemTextColor(String menuItemTextColor) {
        this.menuItemTextColor = menuItemTextColor;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setLayout(String layout) {
        this.layout = layout;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setOrderExecute(EasyOrderExecuteCustom orderExecute) {
        this.orderExecute = orderExecute;
    }

    public void setCallBackExecute(EasyOrderExecuteCustom callBackExecute) {
        this.callBackExecute = callBackExecute;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EasyOrder)) {
            return false;
        }
        EasyOrder other = (EasyOrder)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$fontSize = this.getFontSize();
        Integer other$fontSize = other.getFontSize();
        if (this$fontSize == null ? other$fontSize != null : !((Object)this$fontSize).equals(other$fontSize)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$menuItemBackground = this.getMenuItemBackground();
        String other$menuItemBackground = other.getMenuItemBackground();
        if (this$menuItemBackground == null ? other$menuItemBackground != null : !this$menuItemBackground.equals(other$menuItemBackground)) {
            return false;
        }
        String this$menuItemRunBackground = this.getMenuItemRunBackground();
        String other$menuItemRunBackground = other.getMenuItemRunBackground();
        if (this$menuItemRunBackground == null ? other$menuItemRunBackground != null : !this$menuItemRunBackground.equals(other$menuItemRunBackground)) {
            return false;
        }
        String this$menuItemTextColor = this.getMenuItemTextColor();
        String other$menuItemTextColor = other.getMenuItemTextColor();
        if (this$menuItemTextColor == null ? other$menuItemTextColor != null : !this$menuItemTextColor.equals(other$menuItemTextColor)) {
            return false;
        }
        List this$workTypes = this.getWorkTypes();
        List other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !((Object)this$workTypes).equals(other$workTypes)) {
            return false;
        }
        List this$workStations = this.getWorkStations();
        List other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !((Object)this$workStations).equals(other$workStations)) {
            return false;
        }
        String this$layout = this.getLayout();
        String other$layout = other.getLayout();
        if (this$layout == null ? other$layout != null : !this$layout.equals(other$layout)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        if (this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel)) {
            return false;
        }
        EasyOrderExecuteCustom this$orderExecute = this.getOrderExecute();
        EasyOrderExecuteCustom other$orderExecute = other.getOrderExecute();
        if (this$orderExecute == null ? other$orderExecute != null : !this$orderExecute.equals(other$orderExecute)) {
            return false;
        }
        EasyOrderExecuteCustom this$callBackExecute = this.getCallBackExecute();
        EasyOrderExecuteCustom other$callBackExecute = other.getCallBackExecute();
        return !(this$callBackExecute == null ? other$callBackExecute != null : !this$callBackExecute.equals(other$callBackExecute));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EasyOrder;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $fontSize = this.getFontSize();
        result = result * 59 + ($fontSize == null ? 43 : ((Object)$fontSize).hashCode());
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $menuItemBackground = this.getMenuItemBackground();
        result = result * 59 + ($menuItemBackground == null ? 43 : $menuItemBackground.hashCode());
        String $menuItemRunBackground = this.getMenuItemRunBackground();
        result = result * 59 + ($menuItemRunBackground == null ? 43 : $menuItemRunBackground.hashCode());
        String $menuItemTextColor = this.getMenuItemTextColor();
        result = result * 59 + ($menuItemTextColor == null ? 43 : $menuItemTextColor.hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        String $layout = this.getLayout();
        result = result * 59 + ($layout == null ? 43 : $layout.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        EasyOrderExecuteCustom $orderExecute = this.getOrderExecute();
        result = result * 59 + ($orderExecute == null ? 43 : $orderExecute.hashCode());
        EasyOrderExecuteCustom $callBackExecute = this.getCallBackExecute();
        result = result * 59 + ($callBackExecute == null ? 43 : $callBackExecute.hashCode());
        return result;
    }

    public String toString() {
        return "EasyOrder(menuId=" + this.getMenuId() + ", label=" + this.getLabel() + ", menuItemBackground=" + this.getMenuItemBackground() + ", menuItemRunBackground=" + this.getMenuItemRunBackground() + ", fontSize=" + this.getFontSize() + ", menuItemTextColor=" + this.getMenuItemTextColor() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", layout=" + this.getLayout() + ", taskLabel=" + this.getTaskLabel() + ", orderExecute=" + this.getOrderExecute() + ", callBackExecute=" + this.getCallBackExecute() + ")";
    }
}

