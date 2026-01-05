/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.Cards
 *  com.seer.rds.config.configview.operator.DemandTask
 *  com.seer.rds.config.configview.operator.Distributes
 *  com.seer.rds.config.configview.operator.EasyOrders
 *  com.seer.rds.config.configview.operator.OperatorConfig
 *  com.seer.rds.config.configview.operator.OperatorOrder
 *  com.seer.rds.config.configview.operator.OperatorTableShow
 *  com.seer.rds.config.configview.operator.OperatorWorkStation
 *  com.seer.rds.config.configview.operator.OperatorWorkType
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.Cards;
import com.seer.rds.config.configview.operator.DemandTask;
import com.seer.rds.config.configview.operator.Distributes;
import com.seer.rds.config.configview.operator.EasyOrders;
import com.seer.rds.config.configview.operator.OperatorOrder;
import com.seer.rds.config.configview.operator.OperatorTableShow;
import com.seer.rds.config.configview.operator.OperatorWorkStation;
import com.seer.rds.config.configview.operator.OperatorWorkType;
import java.util.ArrayList;
import java.util.List;

public class OperatorConfig {
    private Boolean runtimeMenuPropsUpdate = false;
    private List<OperatorWorkStation> workStations = new ArrayList();
    private List<OperatorWorkType> workTypes = new ArrayList();
    private List<OperatorOrder> orders = new ArrayList();
    private DemandTask demandTask = null;
    private List<String> taskListItems = null;
    private OperatorTableShow tableShow = null;
    private EasyOrders easyOrders = null;
    private Cards cards = null;
    private Distributes distribute = null;

    public Boolean getRuntimeMenuPropsUpdate() {
        return this.runtimeMenuPropsUpdate;
    }

    public List<OperatorWorkStation> getWorkStations() {
        return this.workStations;
    }

    public List<OperatorWorkType> getWorkTypes() {
        return this.workTypes;
    }

    public List<OperatorOrder> getOrders() {
        return this.orders;
    }

    public DemandTask getDemandTask() {
        return this.demandTask;
    }

    public List<String> getTaskListItems() {
        return this.taskListItems;
    }

    public OperatorTableShow getTableShow() {
        return this.tableShow;
    }

    public EasyOrders getEasyOrders() {
        return this.easyOrders;
    }

    public Cards getCards() {
        return this.cards;
    }

    public Distributes getDistribute() {
        return this.distribute;
    }

    public void setRuntimeMenuPropsUpdate(Boolean runtimeMenuPropsUpdate) {
        this.runtimeMenuPropsUpdate = runtimeMenuPropsUpdate;
    }

    public void setWorkStations(List<OperatorWorkStation> workStations) {
        this.workStations = workStations;
    }

    public void setWorkTypes(List<OperatorWorkType> workTypes) {
        this.workTypes = workTypes;
    }

    public void setOrders(List<OperatorOrder> orders) {
        this.orders = orders;
    }

    public void setDemandTask(DemandTask demandTask) {
        this.demandTask = demandTask;
    }

    public void setTaskListItems(List<String> taskListItems) {
        this.taskListItems = taskListItems;
    }

    public void setTableShow(OperatorTableShow tableShow) {
        this.tableShow = tableShow;
    }

    public void setEasyOrders(EasyOrders easyOrders) {
        this.easyOrders = easyOrders;
    }

    public void setCards(Cards cards) {
        this.cards = cards;
    }

    public void setDistribute(Distributes distribute) {
        this.distribute = distribute;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorConfig)) {
            return false;
        }
        OperatorConfig other = (OperatorConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$runtimeMenuPropsUpdate = this.getRuntimeMenuPropsUpdate();
        Boolean other$runtimeMenuPropsUpdate = other.getRuntimeMenuPropsUpdate();
        if (this$runtimeMenuPropsUpdate == null ? other$runtimeMenuPropsUpdate != null : !((Object)this$runtimeMenuPropsUpdate).equals(other$runtimeMenuPropsUpdate)) {
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
        List this$orders = this.getOrders();
        List other$orders = other.getOrders();
        if (this$orders == null ? other$orders != null : !((Object)this$orders).equals(other$orders)) {
            return false;
        }
        DemandTask this$demandTask = this.getDemandTask();
        DemandTask other$demandTask = other.getDemandTask();
        if (this$demandTask == null ? other$demandTask != null : !this$demandTask.equals(other$demandTask)) {
            return false;
        }
        List this$taskListItems = this.getTaskListItems();
        List other$taskListItems = other.getTaskListItems();
        if (this$taskListItems == null ? other$taskListItems != null : !((Object)this$taskListItems).equals(other$taskListItems)) {
            return false;
        }
        OperatorTableShow this$tableShow = this.getTableShow();
        OperatorTableShow other$tableShow = other.getTableShow();
        if (this$tableShow == null ? other$tableShow != null : !this$tableShow.equals(other$tableShow)) {
            return false;
        }
        EasyOrders this$easyOrders = this.getEasyOrders();
        EasyOrders other$easyOrders = other.getEasyOrders();
        if (this$easyOrders == null ? other$easyOrders != null : !this$easyOrders.equals(other$easyOrders)) {
            return false;
        }
        Cards this$cards = this.getCards();
        Cards other$cards = other.getCards();
        if (this$cards == null ? other$cards != null : !this$cards.equals(other$cards)) {
            return false;
        }
        Distributes this$distribute = this.getDistribute();
        Distributes other$distribute = other.getDistribute();
        return !(this$distribute == null ? other$distribute != null : !this$distribute.equals(other$distribute));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $runtimeMenuPropsUpdate = this.getRuntimeMenuPropsUpdate();
        result = result * 59 + ($runtimeMenuPropsUpdate == null ? 43 : ((Object)$runtimeMenuPropsUpdate).hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        List $orders = this.getOrders();
        result = result * 59 + ($orders == null ? 43 : ((Object)$orders).hashCode());
        DemandTask $demandTask = this.getDemandTask();
        result = result * 59 + ($demandTask == null ? 43 : $demandTask.hashCode());
        List $taskListItems = this.getTaskListItems();
        result = result * 59 + ($taskListItems == null ? 43 : ((Object)$taskListItems).hashCode());
        OperatorTableShow $tableShow = this.getTableShow();
        result = result * 59 + ($tableShow == null ? 43 : $tableShow.hashCode());
        EasyOrders $easyOrders = this.getEasyOrders();
        result = result * 59 + ($easyOrders == null ? 43 : $easyOrders.hashCode());
        Cards $cards = this.getCards();
        result = result * 59 + ($cards == null ? 43 : $cards.hashCode());
        Distributes $distribute = this.getDistribute();
        result = result * 59 + ($distribute == null ? 43 : $distribute.hashCode());
        return result;
    }

    public String toString() {
        return "OperatorConfig(runtimeMenuPropsUpdate=" + this.getRuntimeMenuPropsUpdate() + ", workStations=" + this.getWorkStations() + ", workTypes=" + this.getWorkTypes() + ", orders=" + this.getOrders() + ", demandTask=" + this.getDemandTask() + ", taskListItems=" + this.getTaskListItems() + ", tableShow=" + this.getTableShow() + ", easyOrders=" + this.getEasyOrders() + ", cards=" + this.getCards() + ", distribute=" + this.getDistribute() + ")";
    }
}

