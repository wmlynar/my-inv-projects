/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.SweeperBp
 *  com.seer.rds.service.wind.vo.AlarmInfo
 *  com.seer.rds.service.wind.vo.OrderInfo
 *  com.seer.rds.service.wind.vo.SweeperOrderInfo
 *  com.seer.rds.util.BlockStatusUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.WindBlockVo
 *  com.seer.rds.vo.wind.SweeperBpField
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.StopException;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.service.wind.vo.AlarmInfo;
import com.seer.rds.service.wind.vo.OrderInfo;
import com.seer.rds.service.wind.vo.SweeperOrderInfo;
import com.seer.rds.util.BlockStatusUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.WindBlockVo;
import com.seer.rds.vo.wind.SweeperBpField;
import java.io.IOException;
import java.util.HashMap;
import java.util.UUID;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SweeperBp")
@Scope(value="prototype")
public class SweeperBp
extends AbstractBp<TaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(SweeperBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object vehicleObj = this.blockInputParamsValue.get(SweeperBpField.vehicle);
        Object workAreaObj = this.blockInputParamsValue.get(SweeperBpField.workArea);
        Object priorityObj = this.blockInputParamsValue.get(SweeperBpField.priority);
        if (vehicleObj == null) {
            throw new RuntimeException("@{wind.bp.vehicleIDEmpty}");
        }
        if (workAreaObj == null) {
            throw new RuntimeException("@{wind.bp.SweeperBpEmpty}");
        }
        String uuid = UUID.randomUUID().toString();
        BlockStatusUtils.getBlockRecord((BaseRecord)this.taskRecord, (WindBlockVo)this.blockVo, (WindBlockRecord)this.blockRecord);
        if (StringUtils.isNotEmpty((CharSequence)this.blockRecord.getOrderId())) {
            uuid = this.blockRecord.getOrderId();
        }
        this.saveLogInfo(String.format("@{wind.bp.orderId}=%s", uuid));
        HashMap params = Maps.newHashMap();
        params.put("id", uuid);
        params.put(SweeperBpField.vehicle, vehicleObj.toString());
        params.put(SweeperBpField.workArea, workAreaObj.toString());
        params.put(SweeperBpField.priority, priorityObj == null ? 1 : Integer.parseInt(priorityObj.toString()));
        params.put("externalId", ((TaskRecord)this.taskRecord).getId());
        if (StringUtils.isEmpty((CharSequence)this.blockRecord.getOrderId())) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.setOrder.getUri()), (String)JSONObject.toJSONString((Object)params));
            }
            catch (IOException e) {
                this.saveLogError(e.getMessage());
                Thread.sleep(3000L);
                log.error("SweeperBp setOrder error,retry {}", (Throwable)e);
                throw e;
            }
        }
        this.blockRecord.setOrderId(uuid);
        super.getWindService().saveBlockRecord(this.blockRecord);
        this.monitorOrder(rootBp);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    private void monitorOrder(AbstratRootBp rootBp) throws Exception {
        StringBuffer logMsg = new StringBuffer();
        while (true) {
            String res = "";
            String orderState = "";
            try {
                Thread.sleep(3000L);
                res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.sweepOrderDetails.getUri()) + "/" + this.blockRecord.getOrderId()));
                if (StringUtils.equals((CharSequence)res, (CharSequence)logMsg)) {
                    log.info("SweeperBp form core info  {}", (Object)res);
                }
                logMsg.setLength(0);
                logMsg.append(res);
                if (StringUtils.isNotEmpty((CharSequence)res)) {
                    OrderInfo changeWaterOrder;
                    SweeperOrderInfo sweeperOrderInfo = (SweeperOrderInfo)JSONObject.parseObject((String)res, SweeperOrderInfo.class);
                    orderState = sweeperOrderInfo.getState();
                    Integer createTime = sweeperOrderInfo.getCreateTime();
                    Integer terminateTime = sweeperOrderInfo.getTerminateTime();
                    String vehicle = sweeperOrderInfo.getVehicle();
                    WindTaskStatus.updateTaskTimeAndAgvAndCost((Integer)createTime, (Integer)terminateTime, (String)vehicle, (AbstratRootBp)rootBp, (TaskRecord)((TaskRecord)this.taskRecord));
                    if (StringUtils.equals((CharSequence)orderState, (CharSequence)"STOPPED")) {
                        Object taskStatusObj = GlobalCacheConfig.getCache((String)(this.taskId + ((TaskRecord)this.taskRecord).getId()));
                        Boolean taskStatusStop = taskStatusObj == null || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.stop.getStatus() || ((Integer)taskStatusObj).intValue() == TaskStatusEnum.manual_end.getStatus();
                        if (!taskStatusStop.booleanValue()) {
                            throw new EndErrorException(String.format("@{wind.bp.orderStop}, @{wind.bp.orderId}=%s, @{wind.bp.reason}=%s", this.blockRecord.getOrderId(), ""));
                        }
                        throw new StopException("@{wind.bp.stopHand}");
                    }
                    if (StringUtils.equals((CharSequence)orderState, (CharSequence)"FINISHED")) break;
                    OrderInfo cleanOrder = sweeperOrderInfo.getCleanOrder();
                    if (cleanOrder == null || !this.orderState(cleanOrder) || (changeWaterOrder = sweeperOrderInfo.getChangeWaterOrder()) == null) continue;
                    if (!this.orderState(changeWaterOrder)) {
                        this.saveLogInfo(String.format("@{wind.bp.SweeperBpChangeOrderId}=%s", sweeperOrderInfo.getChangeWaterOrder()));
                        continue;
                    }
                    OrderInfo recleanOrder = sweeperOrderInfo.getRecleanOrder();
                    if (recleanOrder == null) continue;
                    if (!this.orderState(recleanOrder)) {
                        this.saveLogInfo(String.format("@{wind.bp.SweeperBpRecleanOrderId}=%s", sweeperOrderInfo.getRecleanOrderId()));
                        continue;
                    }
                }
                WindTaskStatus.sendTaskEndErrorAndTaskStop((AbstractBp)this, (String)orderState);
            }
            catch (Exception e) {
                if (e instanceof EndErrorException || e instanceof StopException) {
                    throw e;
                }
                log.error("error {}", (Throwable)e);
            }
        }
    }

    private boolean orderState(OrderInfo order) {
        String state = order.getState();
        if (StringUtils.equals((CharSequence)state, (CharSequence)"STOPPED")) {
            return true;
        }
        if (StringUtils.equals((CharSequence)"FAILED", (CharSequence)state)) {
            String msg = order.getErrors() == null ? "" : ((AlarmInfo)order.getErrors().get(0)).getDesc();
            this.saveLogSuspend(String.format("@{wind.bp.robotOperate}, orderId=%s, @{wind.bp.reason}=%s", this.blockRecord.getOrderId(), msg));
        } else if (StringUtils.equals((CharSequence)state, (CharSequence)"FINISHED")) {
            return true;
        }
        return false;
    }
}

