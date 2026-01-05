/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.tcp.ServerChannelHandler
 *  com.seer.rds.tcp.ServerChannelInitializer
 *  io.netty.channel.ChannelHandler
 *  io.netty.channel.ChannelInitializer
 *  io.netty.channel.ChannelPipeline
 *  io.netty.channel.socket.SocketChannel
 *  io.netty.handler.codec.string.StringDecoder
 *  io.netty.handler.codec.string.StringEncoder
 *  io.netty.handler.timeout.IdleStateHandler
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.tcp;

import com.seer.rds.tcp.ServerChannelHandler;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.handler.timeout.IdleStateHandler;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ServerChannelInitializer
extends ChannelInitializer<SocketChannel> {
    @Autowired
    ServerChannelHandler serverChannelHandler;

    protected void initChannel(SocketChannel socketChannel) throws Exception {
        ChannelPipeline pipeline = socketChannel.pipeline();
        pipeline.addLast("idleStateHandler", (ChannelHandler)new IdleStateHandler(15L, 0L, 0L, TimeUnit.MINUTES));
        pipeline.addLast(new ChannelHandler[]{new StringDecoder(), new StringEncoder()});
        pipeline.addLast("serverChannelHandler", (ChannelHandler)this.serverChannelHandler);
    }
}

