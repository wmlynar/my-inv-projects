/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.MessageEnum
 *  com.seer.rds.constant.TaskLogLevelEnum
 *  com.seer.rds.exception.EndErrorException
 *  com.seer.rds.exception.StopException
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.admin.UserMessageService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SpringUtil
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.MessageEnum;
import com.seer.rds.constant.TaskLogLevelEnum;
import com.seer.rds.exception.EndErrorException;
import com.seer.rds.exception.StopException;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.schedule.queryOrderListSchedule;
import com.seer.rds.service.admin.UserMessageService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.SpringUtil;
import java.io.IOException;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class WindTaskStatus {
    private static final Logger log = LoggerFactory.getLogger(WindTaskStatus.class);

    public static Boolean queryCoreOrderDetails(String orderId) throws InterruptedException {
        JSONObject jsonRes;
        if (StringUtils.isEmpty((CharSequence)orderId)) {
            return true;
        }
        String res = "";
        res = queryOrderListSchedule.queryOrder((String)orderId, (Instant)Instant.now());
        if (res == null) {
            while (true) {
                try {
                    res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.orderDetails.getUri()) + "/" + orderId));
                }
                catch (IOException e) {
                    log.error("query task block result error,orderId={}, error={}", (Object)orderId, (Object)e);
                    Thread.sleep(1000L);
                    continue;
                }
                break;
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)res) && !"null".equals(res) && "STOPPED".equals((jsonRes = JSONObject.parseObject((String)res)).getString("state"))) {
            log.info("queryCoreOrderDetails result,orderId={}, res={}", (Object)orderId, (Object)res);
            return false;
        }
        return WindTaskStatus.queryCoreDistributeDetails((String)orderId);
    }

    private static Boolean queryCoreDistributeDetails(String orderId) throws InterruptedException {
        JSONObject jsonRes;
        if (StringUtils.isEmpty((CharSequence)orderId)) {
            return true;
        }
        String res = "";
        while (true) {
            try {
                res = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.distributeOrderDetails.getUri()) + "/" + orderId));
            }
            catch (IOException e) {
                log.error("queryCoreOrderDetails,orderId={}, error={}", (Object)orderId, (Object)e);
                Thread.sleep(1000L);
                continue;
            }
            break;
        }
        if (StringUtils.isNotEmpty((CharSequence)res) && !"null".equals(res) && "STOPPED".equals((jsonRes = JSONObject.parseObject((String)res)).getString("state"))) {
            log.info("queryCoreDistributeDetails result,orderId={}, res={}", (Object)orderId, (Object)res);
            return false;
        }
        return true;
    }

    public static void noticeWindTask(String messageTitle, String messageBody) {
        UserMessageService userMessageServiceBean = (UserMessageService)SpringUtil.getBean(UserMessageService.class);
        userMessageServiceBean.addMessageInfo(messageTitle, messageBody, MessageEnum.ERROR.getCode());
        userMessageServiceBean.noticeWebWithUserMessageInfo(null);
    }

    public static void monitorTaskEndErrorAndTaskStop(AbstractBp abstractBp) throws InterruptedException {
        StopException exception = null;
        if (!((Boolean)RootBp.taskStatus.get(abstractBp.taskId + abstractBp.taskRecord.getId())).booleanValue()) {
            exception = new StopException("@{wind.bp.stopHand}");
        }
        if (abstractBp.taskRecord instanceof WindTaskRecord && Optional.ofNullable(exception).isEmpty() && !WindTaskStatus.queryCoreOrderDetails((String)((String)((WindTaskRecord)abstractBp.taskRecord).getOrderId().get())).booleanValue()) {
            exception = new EndErrorException("@{wind.bp.stopError}");
        }
        if (!Optional.ofNullable(exception).isEmpty()) {
            abstractBp.getWindService().saveLog(TaskLogLevelEnum.stop.getLevel(), String.format("[%s]@{wind.bp.unExecutable}", abstractBp.getClass().getSimpleName()), abstractBp.taskRecord.getProjectId(), abstractBp.taskId, abstractBp.taskRecord.getId(), abstractBp.blockVo.getBlockId());
            throw exception;
        }
        abstractBp.checkIfInterrupt();
    }

    public static void sendTaskEndErrorAndTaskStop(AbstractBp abstractBp, String orderStatus) {
        if (StringUtils.equals((CharSequence)orderStatus, (CharSequence)"STOPPED") || StringUtils.equals((CharSequence)orderStatus, (CharSequence)"FINISHED")) {
            return;
        }
        if (!((Boolean)RootBp.taskStatus.get(abstractBp.taskId + abstractBp.taskRecord.getId())).booleanValue() && StringUtils.isNotEmpty((CharSequence)abstractBp.blockRecord.getOrderId())) {
            AgvApiService b = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            b.terminate(abstractBp.blockRecord.getOrderId());
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static void updateTaskTimeAndAgvAndCost(Integer createTime, Integer terminateTime, String agvId, AbstratRootBp rootBp, TaskRecord taskRecord) {
        AbstratRootBp abstratRootBp = rootBp;
        synchronized (abstratRootBp) {
            Object existAgvId;
            boolean flag = false;
            if (createTime != null && createTime > 0) {
                Date time = new Date((long)createTime.intValue() * 1000L);
                if (taskRecord.getFirstExecutorTime() == null || taskRecord.getFirstExecutorTime() != null && taskRecord.getFirstExecutorTime().compareTo(time) > 0) {
                    taskRecord.setFirstExecutorTime(time);
                    flag = true;
                }
            }
            if (StringUtils.isNotEmpty((CharSequence)(existAgvId = taskRecord.getAgvId()))) {
                if (!((String)existAgvId).contains(agvId)) {
                    existAgvId = (String)existAgvId + "," + agvId;
                    flag = true;
                }
            } else {
                existAgvId = agvId;
                flag = true;
            }
            taskRecord.setAgvId((String)existAgvId);
            if (createTime != null && createTime > 0 && terminateTime != null && terminateTime > 0) {
                taskRecord.setExecutorTime(Integer.valueOf((taskRecord.getExecutorTime() == null ? 0 : taskRecord.getExecutorTime()) + (terminateTime - createTime)));
                flag = true;
            }
            if (flag) {
                WindService windService = (WindService)SpringUtil.getBean(WindService.class);
                RecordUpdaterFactory.getUpdater((BaseRecord)taskRecord).updateRecord((BaseRecord)taskRecord);
            }
        }
    }
}

