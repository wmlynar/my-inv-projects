/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.service.wind.ErrorHandleService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.OkHttpUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.context.annotation.ScopedProxyMode
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import java.io.IOException;
import java.util.ArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component
@Scope(value="prototype", proxyMode=ScopedProxyMode.TARGET_CLASS)
public class ErrorHandleService {
    private static final Logger log = LoggerFactory.getLogger(ErrorHandleService.class);

    public void operationManualEnd(String agvId) {
        JSONObject param = new JSONObject();
        ArrayList<String> vehicleList = new ArrayList<String>();
        vehicleList.add(agvId);
        param.put("vehicles", vehicleList);
        boolean _taskStatus = true;
        while (_taskStatus) {
            try {
                String manualFinished = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.manualFinished.getUri()), (String)param.toJSONString());
                JSONObject manualFinishedObject = JSON.parseObject((String)manualFinished);
                if (manualFinishedObject != null && manualFinishedObject.get((Object)"code").equals(0)) break;
                log.info("manualFinished task resp={}", (Object)manualFinished);
                break;
            }
            catch (IOException ee) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("manualFinished task sleep error {}", (Object)ex.getMessage());
                }
            }
        }
    }

    public void operationRedoFailedOrder(String agvId) {
        JSONObject param = new JSONObject();
        ArrayList<String> vehicleList = new ArrayList<String>();
        vehicleList.add(agvId);
        param.put("vehicles", vehicleList);
        boolean _taskStatus = true;
        while (_taskStatus) {
            try {
                String redoFailedOrderFinished = OkHttpUtil.postJsonParams((String)RootBp.getUrl((String)ApiEnum.redoFailedOrder.getUri()), (String)param.toJSONString());
                JSONObject redoFailedOrderFinishedObject = JSON.parseObject((String)redoFailedOrderFinished);
                if (redoFailedOrderFinishedObject != null && redoFailedOrderFinishedObject.get((Object)"code").equals(0)) break;
                log.info("redoFailedOrder task resp={}", (Object)redoFailedOrderFinished);
                break;
            }
            catch (IOException ee) {
                try {
                    Thread.sleep(3000L);
                }
                catch (InterruptedException ex) {
                    log.error("redoFailedOrder task sleep error {}", (Object)ex.getMessage());
                }
            }
        }
    }
}

