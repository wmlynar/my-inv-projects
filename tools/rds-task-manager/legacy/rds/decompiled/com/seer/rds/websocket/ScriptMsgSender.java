/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.RdsServer
 *  com.seer.rds.websocket.ScriptMsgSender
 *  com.seer.rds.websocket.ScriptMsgSender$ScriptLog
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.websocket;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.websocket.RdsServer;
import com.seer.rds.websocket.ScriptMsgSender;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ScriptMsgSender {
    @Autowired
    private RdsServer rdsServer;

    public void sendScriptLog(List<ScriptLog> logs) {
        ResultVo success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_SCRIPT_LOG, (Object)logs.get(0));
        this.rdsServer.sendMessage(JSONObject.toJSONString((Object)success));
    }
}

