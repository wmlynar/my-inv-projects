/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.LocaleConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.admin.UserMessageService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.RdsServer
 *  javax.websocket.OnClose
 *  javax.websocket.OnError
 *  javax.websocket.OnMessage
 *  javax.websocket.OnOpen
 *  javax.websocket.Session
 *  javax.websocket.server.PathParam
 *  javax.websocket.server.ServerEndpoint
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.websocket;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.LocaleConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.admin.UserMessageService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@ServerEndpoint(value="/wsc/{clientType}")
@Component
public class RdsServer {
    private static final Logger log = LoggerFactory.getLogger(RdsServer.class);
    private static AtomicInteger onlineCount = new AtomicInteger(0);
    private static Map<String, Session> clients = new ConcurrentHashMap();
    private static Map<String, Session> webClientSessions = new ConcurrentHashMap();
    private static Map<String, String> webClientSessionsLanguage = new ConcurrentHashMap();
    private static final Map<Session, String> pdaClientSessions = new ConcurrentHashMap();

    @OnOpen
    public void onOpen(Session session) {
        onlineCount.incrementAndGet();
        clients.put(session.getId(), session);
    }

    @OnClose
    public void onClose(@PathParam(value="clientType") String clientType, Session session) {
        onlineCount.decrementAndGet();
        clients.remove(session.getId());
        if ("web".equals(clientType)) {
            String removeKey = "";
            for (Map.Entry sessionEntry : webClientSessions.entrySet()) {
                Session thisSession = (Session)sessionEntry.getValue();
                if (!thisSession.getId().equals(session.getId())) continue;
                removeKey = (String)sessionEntry.getKey();
                webClientSessionsLanguage.remove(session.getId());
                break;
            }
            webClientSessions.remove(removeKey);
        } else {
            pdaClientSessions.remove(session);
        }
    }

    @OnMessage
    public void onMessage(@PathParam(value="clientType") String clientType, String message, Session session) {
        JSONObject param = JSON.parseObject((String)message);
        JSONObject clientMessage = param.getJSONObject("message");
        if ("web".equals(clientType)) {
            String userId = clientMessage.getString("userid");
            String language = clientMessage.getString("language");
            webClientSessions.put(userId + ":" + session.getId(), session);
            webClientSessionsLanguage.put(session.getId(), language == null ? "zh" : language);
            SysAlarmService sysAlarmService = (SysAlarmService)SpringUtil.getBean(SysAlarmService.class);
            sysAlarmService.noticeAlarmInfo(session);
            UserMessageService userMessageServiceBean = (UserMessageService)SpringUtil.getBean(UserMessageService.class);
            userMessageServiceBean.noticeWebWithUserMessageInfo(session);
            this.sendMessage(JSON.toJSONString((Object)ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_USER_TIMING, (Object)(WindTaskService.windTaskRestrictions != null && StringUtils.isNotEmpty((CharSequence)WindTaskService.windTaskRestrictions.getStrategy()) ? 1 : 0))), session);
        } else {
            String userName = clientMessage.getString("userName");
            String workType = clientMessage.getString("workType");
            String workStation = clientMessage.getString("workStation");
            pdaClientSessions.put(session, userName + "$" + workType + "$" + workStation);
        }
    }

    @OnError
    public void onError(Session session, Throwable error) {
        log.error("Error occurred, {}", error);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void sendMessage(String message) {
        for (Map.Entry sessionEntry : clients.entrySet()) {
            Session toSession;
            Session session = toSession = (Session)sessionEntry.getValue();
            synchronized (session) {
                try {
                    if (toSession.isOpen()) {
                        toSession.getBasicRemote().sendText(message);
                    }
                }
                catch (IOException e) {
                    log.error("\u5411sessionId:{} \u53d1\u9001websocket\u5931\u8d25.{}", (Object)toSession.getId(), (Object)e.getMessage());
                }
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void sendMessage(String message, Session toSession) {
        Session session = toSession;
        synchronized (session) {
            String language = (String)webClientSessionsLanguage.get(toSession.getId());
            try {
                LocaleMessageUtil localeMessageUtil = (LocaleMessageUtil)SpringUtil.getBean(LocaleMessageUtil.class);
                LocaleConfig localeConfig = (LocaleConfig)SpringUtil.getBean(LocaleConfig.class);
                if (toSession.isOpen()) {
                    toSession.getBasicRemote().sendText(language == null ? message : localeMessageUtil.getMessageMatch(message, localeConfig.transformationLanguage(language)));
                }
            }
            catch (IOException e) {
                log.error("\u5411sessionId:{} \u53d1\u9001websocket\u5931\u8d25.{}", (Object)toSession.getId(), (Object)e.getMessage());
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void sendWebMessage(String message) {
        for (Map.Entry sessionEntry : webClientSessions.entrySet()) {
            Session toSession = (Session)sessionEntry.getValue();
            String language = (String)webClientSessionsLanguage.get(toSession.getId());
            Session session = toSession;
            synchronized (session) {
                try {
                    LocaleMessageUtil localeMessageUtil = (LocaleMessageUtil)SpringUtil.getBean(LocaleMessageUtil.class);
                    LocaleConfig localeConfig = (LocaleConfig)SpringUtil.getBean(LocaleConfig.class);
                    if (toSession.isOpen()) {
                        toSession.getBasicRemote().sendText(localeMessageUtil.getMessageMatch(message, localeConfig.transformationLanguage(language)));
                    }
                }
                catch (IOException e) {
                    log.error("\u5411sessionId:{} \u53d1\u9001websocket\u5931\u8d25.{}", (Object)toSession.getId(), (Object)e.getMessage());
                }
            }
        }
    }

    public void sendPdaMessageByWorkTypesOrWorkStations(String workTypes, String workStations, String message, Integer retryTimes) {
        List sessions = this.getSessionsByWorkTypesOrWorkStations(workTypes, workStations);
        this.sendPdaMsgByRetry(message, retryTimes, sessions);
    }

    public void sendPdaMessageByUserNames(String userNames, String message, Integer retryTimes) {
        List sessions = this.getSessionsByUsernames(userNames);
        this.sendPdaMsgByRetry(message, retryTimes, sessions);
    }

    private List<Session> getSessionsByUsernames(String userNames) {
        String[] usernamesSplit = userNames.split(",");
        List<String> usernameList = Arrays.asList(usernamesSplit);
        ArrayList<Session> sessions = new ArrayList<Session>();
        for (Map.Entry sessionStringEntry : pdaClientSessions.entrySet()) {
            String value = (String)sessionStringEntry.getValue();
            String username = value.split("\\$")[0];
            if (!usernameList.contains(username)) continue;
            sessions.add((Session)sessionStringEntry.getKey());
        }
        return sessions;
    }

    private List<Session> getSessionsByWorkTypesOrWorkStations(String workTypes, String workStations) {
        String workType;
        String[] split;
        String value;
        String[] workTypesSplit = workTypes.split(",");
        String[] workStationsSplit = workStations.split(",");
        if ("".equals(workTypesSplit[0]) && "".equals(workStationsSplit[0])) {
            return new ArrayList<Session>(pdaClientSessions.keySet());
        }
        ArrayList<Session> sessions = new ArrayList<Session>();
        List<String> workTypesList = Arrays.asList(workTypesSplit);
        List<String> workStationsList = Arrays.asList(workStationsSplit);
        if (!"".equals(workTypesSplit[0]) && !"".equals(workStationsSplit[0])) {
            for (Map.Entry sessionStringEntry : pdaClientSessions.entrySet()) {
                String workStation;
                value = (String)sessionStringEntry.getValue();
                split = value.split("\\$");
                if (split.length <= 1) continue;
                workType = split[1];
                String string = workStation = split.length >= 3 ? split[2] : "";
                if (!workTypesList.contains(workType) || !workStationsList.contains(workStation)) continue;
                sessions.add((Session)sessionStringEntry.getKey());
            }
        }
        if ("".equals(workTypesSplit[0]) && !"".equals(workStationsSplit[0])) {
            for (Map.Entry sessionStringEntry : pdaClientSessions.entrySet()) {
                String workStation;
                value = (String)sessionStringEntry.getValue();
                split = value.split("\\$");
                if (split.length <= 1 || !workStationsList.contains(workStation = split.length >= 3 ? split[2] : "")) continue;
                sessions.add((Session)sessionStringEntry.getKey());
            }
        }
        if (!"".equals(workTypesSplit[0]) && "".equals(workStationsSplit[0])) {
            for (Map.Entry sessionStringEntry : pdaClientSessions.entrySet()) {
                value = (String)sessionStringEntry.getValue();
                split = value.split("\\$");
                if (split.length <= 1 || !workTypesList.contains(workType = split[1])) continue;
                sessions.add((Session)sessionStringEntry.getKey());
            }
        }
        return sessions;
    }

    private void sendPdaMsgByRetry(String message, Integer retryTimes, List<Session> sessions) {
        int sendTimes = 0;
        for (Session session : sessions) {
            boolean success;
            do {
                success = this.trySendMessage(message, session);
            } while (retryTimes != null && retryTimes != 0 && (retryTimes == -1 || retryTimes >= ++sendTimes) && !success);
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private boolean trySendMessage(String message, Session toSession) {
        Session session = toSession;
        synchronized (session) {
            try {
                if (toSession.isOpen()) {
                    toSession.getBasicRemote().sendText(message);
                }
            }
            catch (IOException e) {
                log.error("\u5411sessionId:{} \u53d1\u9001websocket\u5931\u8d25.{}", (Object)toSession.getId(), (Object)e.getMessage());
                return false;
            }
        }
        return true;
    }
}

