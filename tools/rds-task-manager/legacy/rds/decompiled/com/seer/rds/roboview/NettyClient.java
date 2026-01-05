/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.NettyClient
 *  com.seer.rds.roboview.RoboChannel
 *  io.netty.bootstrap.Bootstrap
 *  io.netty.channel.ChannelFuture
 *  io.netty.channel.ChannelHandler
 *  io.netty.channel.ChannelOption
 *  io.netty.channel.EventLoopGroup
 *  io.netty.channel.socket.nio.NioSocketChannel
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.roboview;

import com.seer.rds.roboview.RoboChannel;
import io.netty.bootstrap.Bootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.socket.nio.NioSocketChannel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class NettyClient {
    private static final Logger log = LoggerFactory.getLogger(NettyClient.class);

    private NettyClient() {
    }

    private static RoboChannel connect(String host, int port, int connectTimeout, int rwTimeout, EventLoopGroup workerGroup, int rcvBUF) {
        try {
            Bootstrap b = new Bootstrap();
            ((Bootstrap)((Bootstrap)((Bootstrap)((Bootstrap)((Bootstrap)b.group(workerGroup)).channel(NioSocketChannel.class)).option(ChannelOption.SO_KEEPALIVE, (Object)true)).option(ChannelOption.CONNECT_TIMEOUT_MILLIS, (Object)connectTimeout)).option(ChannelOption.SO_RCVBUF, (Object)(1024 * rcvBUF))).handler((ChannelHandler)new /* Unavailable Anonymous Inner Class!! */);
            ChannelFuture channelFuture = b.connect(host, port).sync();
            if (channelFuture != null && channelFuture.isSuccess()) {
                log.debug("Client,\u8fde\u63a5\u670d\u52a1\u7aef\u6210\u529f {}, {}", (Object)host, (Object)port);
                RoboChannel roboChannel = new RoboChannel();
                roboChannel.setRwTimeout(Integer.valueOf(rwTimeout));
                roboChannel.setChannel(channelFuture.channel());
                return roboChannel;
            }
            log.error("RoboView connect error ip:port = {}:{}", (Object)host, (Object)port);
        }
        catch (Exception e) {
            log.error("RoboView connect error ip:port = {}:{} error = {}", new Object[]{host, port, e});
        }
        return null;
    }

    public static RoboChannel getTcpClients(String host, int port, int connectTimeout, int rwTimeout, EventLoopGroup workerGroup, int rcvBUF) {
        return NettyClient.connect((String)host, (int)port, (int)connectTimeout, (int)rwTimeout, (EventLoopGroup)workerGroup, (int)rcvBUF);
    }
}

