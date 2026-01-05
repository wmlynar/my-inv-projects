/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.websocket.ServerEncoder
 *  com.seer.rds.websocket.WebSocketServer
 *  javax.websocket.OnClose
 *  javax.websocket.OnError
 *  javax.websocket.OnMessage
 *  javax.websocket.OnOpen
 *  javax.websocket.RemoteEndpoint$Async
 *  javax.websocket.Session
 *  javax.websocket.server.PathParam
 *  javax.websocket.server.ServerEndpoint
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.websocket;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.websocket.ServerEncoder;
import java.io.IOException;
import java.lang.reflect.Field;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.RemoteEndpoint;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/*
 * Exception performing whole class analysis ignored.
 */
@ServerEndpoint(value="/websocket/{clientName}", encoders={ServerEncoder.class})
@Component
@ConditionalOnProperty(prefix="websocket.rds-endpoint", name={"enabled"}, havingValue="true")
public class WebSocketServer {
    private static final Logger log = LoggerFactory.getLogger(WebSocketServer.class);
    private static Map<String, Session> sessionsWithIp = new ConcurrentHashMap();
    private static Map<String, Session> sessionsWithClientName = new ConcurrentHashMap();

    @OnOpen
    public void onOpen(Session session) throws IOException {
        try {
            URI uri = session.getRequestURI();
            String path = uri.getPath();
            String taskName = "";
            taskName = path.substring(path.lastIndexOf("/") + 1);
            sessionsWithClientName.put(taskName, session);
            String ipwithPort = WebSocketServer.getIdFromSession((Session)session);
            String ip = ipwithPort.substring(1, ipwithPort.indexOf(":"));
            sessionsWithIp.put(ip, session);
            session.getBasicRemote().sendText("Successfully connected the client");
            log.info(session.getId() + ": Successfully connected ");
        }
        catch (IOException e) {
            log.error(e.getMessage());
        }
    }

    @OnClose
    public void onClose(@PathParam(value="clientType") String clientType, Session session) {
        try {
            URI uri = session.getRequestURI();
            String path = uri.getPath();
            String ipwithPort = WebSocketServer.getIdFromSession((Session)session);
            String ip = ipwithPort.substring(1, ipwithPort.indexOf(":"));
            String taskName = "";
            taskName = path.substring(path.lastIndexOf("/") + 1);
            if (sessionsWithIp.containsValue(session) && ip != "") {
                sessionsWithIp.remove(ip);
            }
            if (sessionsWithClientName.containsValue(session) && taskName != "") {
                sessionsWithClientName.remove(taskName);
            }
            session.getBasicRemote().sendText("Successfully close the websocket connect");
            log.info("Close the websocket connect");
        }
        catch (IOException e) {
            log.error(e.getMessage());
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        try {
            if (StringUtils.isNotEmpty((CharSequence)message)) {
                String ipwithPort = WebSocketServer.getIdFromSession((Session)session);
                String ip = ipwithPort.substring(1, ipwithPort.indexOf(":"));
                EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
                WindEvent event = new WindEvent();
                event.setType(Integer.valueOf(10));
                eventSource.notify(event);
                JSONObject msgWithIp = new JSONObject();
                msgWithIp.put("ip", (Object)ip);
                msgWithIp.put("clientParams", (Object)message);
                event.setData((Object)JSONObject.toJSONString((Object)msgWithIp));
            }
        }
        catch (Exception e) {
            log.error(" \u5904\u7406websocket\u8bf7\u6c42\u5931\u8d25.{}", (Object)e.getMessage());
        }
    }

    @OnError
    public void onError(Session session, Throwable error) {
        log.error("Error occurred", error);
    }

    public static Map<String, Session> getSessionsWithIp() {
        return sessionsWithIp;
    }

    public static Map<String, Session> getSessionsWithClientName() {
        return sessionsWithClientName;
    }

    private static Object getFieldInstance(Object obj, String fieldPath) {
        String[] fields;
        for (String field : fields = fieldPath.split("#")) {
            if ((obj = WebSocketServer.getField((Object)obj, obj.getClass(), (String)field)) != null) continue;
            return null;
        }
        return obj;
    }

    private static Object getField(Object obj, Class<?> clazz, String fieldName) {
        while (clazz != Object.class) {
            try {
                Field field = clazz.getDeclaredField(fieldName);
                field.setAccessible(true);
                return field.get(obj);
            }
            catch (Exception exception) {
                clazz = clazz.getSuperclass();
            }
        }
        return null;
    }

    private static String getIdFromSession(Session session) {
        RemoteEndpoint.Async async = session.getAsyncRemote();
        if (session != null) {
            InetSocketAddress addr = (InetSocketAddress)WebSocketServer.getFieldInstance((Object)async, (String)"base#socketWrapper#socket#sc#remoteAddress");
            return addr.toString();
        }
        return null;
    }
}

