/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.tcp.ClientChannelHandler
 *  com.seer.rds.tcp.ClientChannelInitializer
 *  io.netty.channel.ChannelHandler
 *  io.netty.channel.ChannelInitializer
 *  io.netty.channel.ChannelPipeline
 *  io.netty.channel.socket.SocketChannel
 *  io.netty.handler.codec.string.StringDecoder
 *  io.netty.handler.codec.string.StringEncoder
 *  io.netty.handler.timeout.IdleStateHandler
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.tcp;

import com.seer.rds.tcp.ClientChannelHandler;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.handler.timeout.IdleStateHandler;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ClientChannelInitializer
extends ChannelInitializer<SocketChannel> {
    private static final Logger log = LoggerFactory.getLogger(ClientChannelInitializer.class);
    @Autowired
    ClientChannelHandler clientChannelHandler;

    protected void initChannel(SocketChannel socketChannel) throws Exception {
        ChannelPipeline pipeline = socketChannel.pipeline();
        pipeline.addLast("idleStateHandler", (ChannelHandler)new IdleStateHandler(15L, 0L, 0L, TimeUnit.MINUTES));
        pipeline.addLast(new ChannelHandler[]{new StringDecoder(), new StringEncoder()});
        pipeline.addLast("clientChannelHandler", (ChannelHandler)this.clientChannelHandler);
    }
}

