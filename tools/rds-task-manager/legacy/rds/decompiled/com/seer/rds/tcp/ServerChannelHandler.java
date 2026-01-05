/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.tcp.NettyTcpServer
 *  com.seer.rds.tcp.ServerChannelHandler
 *  com.seer.rds.util.SpringUtil
 *  io.netty.channel.ChannelHandler$Sharable
 *  io.netty.channel.ChannelHandlerContext
 *  io.netty.channel.SimpleChannelInboundHandler
 *  io.netty.handler.timeout.IdleState
 *  io.netty.handler.timeout.IdleStateEvent
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.tcp;

import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.tcp.NettyTcpServer;
import com.seer.rds.util.SpringUtil;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
@ChannelHandler.Sharable
public class ServerChannelHandler
extends SimpleChannelInboundHandler<Object> {
    private static final Logger log = LoggerFactory.getLogger(ServerChannelHandler.class);

    protected void channelRead0(ChannelHandlerContext channelHandlerContext, Object msg) {
        log.info("Netty tcp server receive message: {}", msg);
        EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
        WindEvent event = new WindEvent();
        event.setType(Integer.valueOf(6));
        event.setData(msg);
        eventSource.notify(event);
    }

    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        super.channelActive(ctx);
        log.info("tcp client " + this.getRemoteAddress(ctx) + " connect success");
        NettyTcpServer.map.put(this.getRemoteAddress(ctx), ctx.channel());
    }

    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        NettyTcpServer.map.remove(this.getRemoteAddress(ctx));
        log.info("tcp client " + this.getRemoteAddress(ctx) + " connect fail");
        ctx.close();
    }

    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        super.exceptionCaught(ctx, cause);
        log.error("\u5f15\u64ce{}\u7684\u901a\u9053\u53d1\u751f\u5f02\u5e38\uff0c\u65ad\u5f00\u8fde\u63a5");
        ctx.close();
    }

    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        String socketString = ctx.channel().remoteAddress().toString();
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent event = (IdleStateEvent)evt;
            if (event.state() == IdleState.READER_IDLE) {
                log.info("Client: " + socketString + " READER_IDLE\u8bfb\u8d85\u65f6");
                ctx.disconnect();
            } else if (event.state() == IdleState.WRITER_IDLE) {
                log.info("Client: " + socketString + " WRITER_IDLE\u5199\u8d85\u65f6");
                ctx.disconnect();
            } else if (event.state() == IdleState.ALL_IDLE) {
                log.info("Client: " + socketString + " ALL_IDLE\u603b\u8d85\u65f6");
                ctx.disconnect();
            }
        }
    }

    public String getRemoteAddress(ChannelHandlerContext channelHandlerContext) {
        String socketString = "";
        socketString = channelHandlerContext.channel().remoteAddress().toString().substring(1);
        return socketString;
    }

    public String getIPString(ChannelHandlerContext channelHandlerContext) {
        String ipString = "";
        String socketString = channelHandlerContext.channel().remoteAddress().toString();
        int colonAt = socketString.indexOf(":");
        ipString = socketString.substring(1, colonAt);
        return ipString;
    }
}

