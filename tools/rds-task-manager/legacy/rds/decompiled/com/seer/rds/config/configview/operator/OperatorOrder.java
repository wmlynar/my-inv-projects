/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorOrder
 *  com.seer.rds.config.configview.operator.OperatorOrderParam
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.OperatorOrderParam;
import java.util.ArrayList;
import java.util.List;

public class OperatorOrder {
    private String menuId = "";
    private String route = "";
    private String label = "";
    private Boolean ifEnableInterfaceManager = false;
    private String menuItemBackground = null;
    private String menuItemTextColor = null;
    private Integer fontSize = 12;
    private Boolean disabled = false;
    private Boolean disabledNotice = false;
    private Boolean canSendTask = true;
    private Boolean showQueryCallback = false;
    private Boolean confirmCallbackMsg = false;
    private String robotTaskDef = "";
    private List<String> workTypes = null;
    private List<String> workStations = null;
    private Boolean loadCache = false;
    private List<OperatorOrderParam> params = new ArrayList();
    private String tip = null;
    private String confirmMessage = null;
    private Boolean confirmHoldMenu = false;
    private String readStoredValueFuncName = "";

    public String getMenuId() {
        return this.menuId;
    }

    public String getRoute() {
        return this.route;
    }

    public String getLabel() {
        return this.label;
    }

    public Boolean getIfEnableInterfaceManager() {
        return this.ifEnableInterfaceManager;
    }

    public String getMenuItemBackground() {
        return this.menuItemBackground;
    }

    public String getMenuItemTextColor() {
        return this.menuItemTextColor;
    }

    public Integer getFontSize() {
        return this.fontSize;
    }

    public Boolean getDisabled() {
        return this.disabled;
    }

    public Boolean getDisabledNotice() {
        return this.disabledNotice;
    }

    public Boolean getCanSendTask() {
        return this.canSendTask;
    }

    public Boolean getShowQueryCallback() {
        return this.showQueryCallback;
    }

    public Boolean getConfirmCallbackMsg() {
        return this.confirmCallbackMsg;
    }

    public String getRobotTaskDef() {
        return this.robotTaskDef;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public Boolean getLoadCache() {
        return this.loadCache;
    }

    public List<OperatorOrderParam> getParams() {
        return this.params;
    }

    public String getTip() {
        return this.tip;
    }

    public String getConfirmMessage() {
        return this.confirmMessage;
    }

    public Boolean getConfirmHoldMenu() {
        return this.confirmHoldMenu;
    }

    public String getReadStoredValueFuncName() {
        return this.readStoredValueFuncName;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setRoute(String route) {
        this.route = route;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setIfEnableInterfaceManager(Boolean ifEnableInterfaceManager) {
        this.ifEnableInterfaceManager = ifEnableInterfaceManager;
    }

    public void setMenuItemBackground(String menuItemBackground) {
        this.menuItemBackground = menuItemBackground;
    }

    public void setMenuItemTextColor(String menuItemTextColor) {
        this.menuItemTextColor = menuItemTextColor;
    }

    public void setFontSize(Integer fontSize) {
        this.fontSize = fontSize;
    }

    public void setDisabled(Boolean disabled) {
        this.disabled = disabled;
    }

    public void setDisabledNotice(Boolean disabledNotice) {
        this.disabledNotice = disabledNotice;
    }

    public void setCanSendTask(Boolean canSendTask) {
        this.canSendTask = canSendTask;
    }

    public void setShowQueryCallback(Boolean showQueryCallback) {
        this.showQueryCallback = showQueryCallback;
    }

    public void setConfirmCallbackMsg(Boolean confirmCallbackMsg) {
        this.confirmCallbackMsg = confirmCallbackMsg;
    }

    public void setRobotTaskDef(String robotTaskDef) {
        this.robotTaskDef = robotTaskDef;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setLoadCache(Boolean loadCache) {
        this.loadCache = loadCache;
    }

    public void setParams(List<OperatorOrderParam> params) {
        this.params = params;
    }

    public void setTip(String tip) {
        this.tip = tip;
    }

    public void setConfirmMessage(String confirmMessage) {
        this.confirmMessage = confirmMessage;
    }

    public void setConfirmHoldMenu(Boolean confirmHoldMenu) {
        this.confirmHoldMenu = confirmHoldMenu;
    }

    public void setReadStoredValueFuncName(String readStoredValueFuncName) {
        this.readStoredValueFuncName = readStoredValueFuncName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorOrder)) {
            return false;
        }
        OperatorOrder other = (OperatorOrder)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifEnableInterfaceManager = this.getIfEnableInterfaceManager();
        Boolean other$ifEnableInterfaceManager = other.getIfEnableInterfaceManager();
        if (this$ifEnableInterfaceManager == null ? other$ifEnableInterfaceManager != null : !((Object)this$ifEnableInterfaceManager).equals(other$ifEnableInterfaceManager)) {
            return false;
        }
        Integer this$fontSize = this.getFontSize();
        Integer other$fontSize = other.getFontSize();
        if (this$fontSize == null ? other$fontSize != null : !((Object)this$fontSize).equals(other$fontSize)) {
            return false;
        }
        Boolean this$disabled = this.getDisabled();
        Boolean other$disabled = other.getDisabled();
        if (this$disabled == null ? other$disabled != null : !((Object)this$disabled).equals(other$disabled)) {
            return false;
        }
        Boolean this$disabledNotice = this.getDisabledNotice();
        Boolean other$disabledNotice = other.getDisabledNotice();
        if (this$disabledNotice == null ? other$disabledNotice != null : !((Object)this$disabledNotice).equals(other$disabledNotice)) {
            return false;
        }
        Boolean this$canSendTask = this.getCanSendTask();
        Boolean other$canSendTask = other.getCanSendTask();
        if (this$canSendTask == null ? other$canSendTask != null : !((Object)this$canSendTask).equals(other$canSendTask)) {
            return false;
        }
        Boolean this$showQueryCallback = this.getShowQueryCallback();
        Boolean other$showQueryCallback = other.getShowQueryCallback();
        if (this$showQueryCallback == null ? other$showQueryCallback != null : !((Object)this$showQueryCallback).equals(other$showQueryCallback)) {
            return false;
        }
        Boolean this$confirmCallbackMsg = this.getConfirmCallbackMsg();
        Boolean other$confirmCallbackMsg = other.getConfirmCallbackMsg();
        if (this$confirmCallbackMsg == null ? other$confirmCallbackMsg != null : !((Object)this$confirmCallbackMsg).equals(other$confirmCallbackMsg)) {
            return false;
        }
        Boolean this$loadCache = this.getLoadCache();
        Boolean other$loadCache = other.getLoadCache();
        if (this$loadCache == null ? other$loadCache != null : !((Object)this$loadCache).equals(other$loadCache)) {
            return false;
        }
        Boolean this$confirmHoldMenu = this.getConfirmHoldMenu();
        Boolean other$confirmHoldMenu = other.getConfirmHoldMenu();
        if (this$confirmHoldMenu == null ? other$confirmHoldMenu != null : !((Object)this$confirmHoldMenu).equals(other$confirmHoldMenu)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        String this$route = this.getRoute();
        String other$route = other.getRoute();
        if (this$route == null ? other$route != null : !this$route.equals(other$route)) {
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
        String this$menuItemTextColor = this.getMenuItemTextColor();
        String other$menuItemTextColor = other.getMenuItemTextColor();
        if (this$menuItemTextColor == null ? other$menuItemTextColor != null : !this$menuItemTextColor.equals(other$menuItemTextColor)) {
            return false;
        }
        String this$robotTaskDef = this.getRobotTaskDef();
        String other$robotTaskDef = other.getRobotTaskDef();
        if (this$robotTaskDef == null ? other$robotTaskDef != null : !this$robotTaskDef.equals(other$robotTaskDef)) {
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
        List this$params = this.getParams();
        List other$params = other.getParams();
        if (this$params == null ? other$params != null : !((Object)this$params).equals(other$params)) {
            return false;
        }
        String this$tip = this.getTip();
        String other$tip = other.getTip();
        if (this$tip == null ? other$tip != null : !this$tip.equals(other$tip)) {
            return false;
        }
        String this$confirmMessage = this.getConfirmMessage();
        String other$confirmMessage = other.getConfirmMessage();
        if (this$confirmMessage == null ? other$confirmMessage != null : !this$confirmMessage.equals(other$confirmMessage)) {
            return false;
        }
        String this$readStoredValueFuncName = this.getReadStoredValueFuncName();
        String other$readStoredValueFuncName = other.getReadStoredValueFuncName();
        return !(this$readStoredValueFuncName == null ? other$readStoredValueFuncName != null : !this$readStoredValueFuncName.equals(other$readStoredValueFuncName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorOrder;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifEnableInterfaceManager = this.getIfEnableInterfaceManager();
        result = result * 59 + ($ifEnableInterfaceManager == null ? 43 : ((Object)$ifEnableInterfaceManager).hashCode());
        Integer $fontSize = this.getFontSize();
        result = result * 59 + ($fontSize == null ? 43 : ((Object)$fontSize).hashCode());
        Boolean $disabled = this.getDisabled();
        result = result * 59 + ($disabled == null ? 43 : ((Object)$disabled).hashCode());
        Boolean $disabledNotice = this.getDisabledNotice();
        result = result * 59 + ($disabledNotice == null ? 43 : ((Object)$disabledNotice).hashCode());
        Boolean $canSendTask = this.getCanSendTask();
        result = result * 59 + ($canSendTask == null ? 43 : ((Object)$canSendTask).hashCode());
        Boolean $showQueryCallback = this.getShowQueryCallback();
        result = result * 59 + ($showQueryCallback == null ? 43 : ((Object)$showQueryCallback).hashCode());
        Boolean $confirmCallbackMsg = this.getConfirmCallbackMsg();
        result = result * 59 + ($confirmCallbackMsg == null ? 43 : ((Object)$confirmCallbackMsg).hashCode());
        Boolean $loadCache = this.getLoadCache();
        result = result * 59 + ($loadCache == null ? 43 : ((Object)$loadCache).hashCode());
        Boolean $confirmHoldMenu = this.getConfirmHoldMenu();
        result = result * 59 + ($confirmHoldMenu == null ? 43 : ((Object)$confirmHoldMenu).hashCode());
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        String $route = this.getRoute();
        result = result * 59 + ($route == null ? 43 : $route.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $menuItemBackground = this.getMenuItemBackground();
        result = result * 59 + ($menuItemBackground == null ? 43 : $menuItemBackground.hashCode());
        String $menuItemTextColor = this.getMenuItemTextColor();
        result = result * 59 + ($menuItemTextColor == null ? 43 : $menuItemTextColor.hashCode());
        String $robotTaskDef = this.getRobotTaskDef();
        result = result * 59 + ($robotTaskDef == null ? 43 : $robotTaskDef.hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : ((Object)$params).hashCode());
        String $tip = this.getTip();
        result = result * 59 + ($tip == null ? 43 : $tip.hashCode());
        String $confirmMessage = this.getConfirmMessage();
        result = result * 59 + ($confirmMessage == null ? 43 : $confirmMessage.hashCode());
        String $readStoredValueFuncName = this.getReadStoredValueFuncName();
        result = result * 59 + ($readStoredValueFuncName == null ? 43 : $readStoredValueFuncName.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorOrder(menuId=" + this.getMenuId() + ", route=" + this.getRoute() + ", label=" + this.getLabel() + ", ifEnableInterfaceManager=" + this.getIfEnableInterfaceManager() + ", menuItemBackground=" + this.getMenuItemBackground() + ", menuItemTextColor=" + this.getMenuItemTextColor() + ", fontSize=" + this.getFontSize() + ", disabled=" + this.getDisabled() + ", disabledNotice=" + this.getDisabledNotice() + ", canSendTask=" + this.getCanSendTask() + ", showQueryCallback=" + this.getShowQueryCallback() + ", confirmCallbackMsg=" + this.getConfirmCallbackMsg() + ", robotTaskDef=" + this.getRobotTaskDef() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", loadCache=" + this.getLoadCache() + ", params=" + this.getParams() + ", tip=" + this.getTip() + ", confirmMessage=" + this.getConfirmMessage() + ", confirmHoldMenu=" + this.getConfirmHoldMenu() + ", readStoredValueFuncName=" + this.getReadStoredValueFuncName() + ")";
    }
}

