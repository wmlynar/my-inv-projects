/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.tcp.NettyTcpServer
 *  com.seer.rds.tcp.ServerChannelInitializer
 *  io.netty.bootstrap.ServerBootstrap
 *  io.netty.channel.Channel
 *  io.netty.channel.ChannelFuture
 *  io.netty.channel.ChannelHandler
 *  io.netty.channel.ChannelOption
 *  io.netty.channel.EventLoopGroup
 *  io.netty.channel.nio.NioEventLoopGroup
 *  io.netty.channel.socket.nio.NioServerSocketChannel
 *  io.netty.util.concurrent.Future
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.tcp;

import com.seer.rds.tcp.ServerChannelInitializer;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.util.concurrent.Future;
import java.io.IOException;
import java.net.ServerSocket;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class NettyTcpServer {
    private static final Logger log = LoggerFactory.getLogger(NettyTcpServer.class);
    private EventLoopGroup boss = new NioEventLoopGroup(1);
    private EventLoopGroup worker = new NioEventLoopGroup();
    @Autowired
    ServerChannelInitializer serverChannelInitializer;
    private Channel channel;
    public static Map<String, Channel> map = new ConcurrentHashMap();

    public ChannelFuture start(Integer port) {
        ServerBootstrap serverBootstrap = new ServerBootstrap();
        ((ServerBootstrap)((ServerBootstrap)((ServerBootstrap)serverBootstrap.group(this.boss, this.worker).channel(NioServerSocketChannel.class)).childHandler((ChannelHandler)this.serverChannelInitializer).option(ChannelOption.SO_REUSEADDR, (Object)true)).option(ChannelOption.SO_BACKLOG, (Object)1024)).childOption(ChannelOption.SO_KEEPALIVE, (Object)true);
        ChannelFuture channelFuture1 = null;
        try {
            new ServerSocket(port).close();
            channelFuture1 = serverBootstrap.bind(port.intValue()).syncUninterruptibly();
            log.info("Netty tcp server start success,port={}", (Object)port);
        }
        catch (IOException e) {
            log.error("Port {} is already in use", (Object)port);
        }
        return channelFuture1;
    }

    public void destroy() {
        if (this.channel != null) {
            this.channel.close();
        }
        try {
            Future future = this.worker.shutdownGracefully().await();
            if (!future.isSuccess()) {
                log.error("netty tcp workerGroup shutdown fail,{}", future.cause());
            }
        }
        catch (InterruptedException e) {
            log.error(e.toString(), (Throwable)e);
        }
        log.info("Netty tcp server shutdown success");
    }
}

