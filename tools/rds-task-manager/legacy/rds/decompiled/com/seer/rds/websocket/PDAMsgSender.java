/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.PDAMsgSender
 *  com.seer.rds.websocket.PDAMsgSender$WorkStationMsg
 *  com.seer.rds.websocket.RdsServer
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.websocket;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.websocket.PDAMsgSender;
import com.seer.rds.websocket.RdsServer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PDAMsgSender {
    @Autowired
    private RdsServer rdsServer;

    public void sendPadMsg(String workTypes, String workStations, String content, Boolean needConfirm, Integer keepTime, Integer retryTimes) {
        WorkStationMsg workStationMsg = new WorkStationMsg();
        workStationMsg.setWorkTypes(workTypes);
        workStationMsg.setWorkStations(workStations);
        workStationMsg.setContent(content);
        workStationMsg.setNeedConfirm(needConfirm);
        workStationMsg.setKeepTime(keepTime);
        ResultVo success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_PDA_ALERT, (Object)workStationMsg);
        this.rdsServer.sendPdaMessageByWorkTypesOrWorkStations(workTypes, workStations, JSONObject.toJSONString((Object)success), retryTimes);
    }

    public void sendPadMsgByUser(String userNames, String content, Boolean needConfirm, Integer keepTime, Integer retryTimes) {
        WorkStationMsg workStationMsg = new WorkStationMsg();
        workStationMsg.setUserNames(userNames);
        workStationMsg.setContent(content);
        workStationMsg.setNeedConfirm(needConfirm);
        workStationMsg.setKeepTime(keepTime);
        ResultVo success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_PDA_USER_ALERT, (Object)workStationMsg);
        this.rdsServer.sendPdaMessageByUserNames(userNames, JSONObject.toJSONString((Object)success), retryTimes);
    }
}

