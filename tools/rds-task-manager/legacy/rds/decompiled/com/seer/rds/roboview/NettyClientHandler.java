/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.NettyClientHandler
 *  com.seer.rds.roboview.NettyClientHandler$ResponseLatch
 *  io.netty.buffer.ByteBuf
 *  io.netty.channel.ChannelHandlerContext
 *  io.netty.channel.ChannelInboundHandlerAdapter
 *  io.netty.util.ReferenceCountUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.roboview;

import com.seer.rds.roboview.NettyClientHandler;
import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.util.ReferenceCountUtil;
import java.util.concurrent.CountDownLatch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NettyClientHandler
extends ChannelInboundHandlerAdapter {
    private static final Logger log = LoggerFactory.getLogger(NettyClientHandler.class);
    private final CountDownLatch latch = new CountDownLatch(1);
    private String response;

    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        log.debug("Client,channelActive");
    }

    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        ByteBuf buf = (ByteBuf)msg;
        if (buf.isReadable()) {
            String message;
            byte[] buffer = new byte[buf.readableBytes()];
            buf.readBytes(buffer);
            this.response = message = new String(buffer, "utf-8");
            this.latch.countDown();
        }
        ReferenceCountUtil.release((Object)msg);
    }

    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        log.error("NettyClient RoboView exceptionCaught {}", cause);
    }

    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        log.debug("Client,channelInactive");
    }

    public String getResponse() {
        return this.response;
    }

    public ResponseLatch getResponseLatch(int rwTimeout) {
        return new ResponseLatch(this, this.latch, rwTimeout);
    }
}

