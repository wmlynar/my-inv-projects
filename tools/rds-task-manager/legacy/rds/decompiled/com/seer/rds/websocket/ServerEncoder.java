/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.core.JsonProcessingException
 *  com.fasterxml.jackson.databind.json.JsonMapper
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.ServerEncoder
 *  javax.websocket.EncodeException
 *  javax.websocket.Encoder$Text
 *  javax.websocket.EndpointConfig
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.seer.rds.vo.ResultVo;
import javax.websocket.EncodeException;
import javax.websocket.Encoder;
import javax.websocket.EndpointConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ServerEncoder
implements Encoder.Text<ResultVo> {
    private static final Logger log = LoggerFactory.getLogger(ServerEncoder.class);

    public void destroy() {
    }

    public void init(EndpointConfig arg0) {
    }

    public String encode(ResultVo responseMessage) throws EncodeException {
        try {
            JsonMapper jsonMapper = new JsonMapper();
            return jsonMapper.writeValueAsString((Object)responseMessage);
        }
        catch (JsonProcessingException e) {
            log.error("ServerEncoder JsonProcessingException", (Throwable)e);
            return null;
        }
    }
}

