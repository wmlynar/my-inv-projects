/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.tcp.ClientChannelInitializer
 *  com.seer.rds.tcp.NettyTcpClient
 *  io.netty.bootstrap.Bootstrap
 *  io.netty.channel.Channel
 *  io.netty.channel.ChannelFuture
 *  io.netty.channel.ChannelHandler
 *  io.netty.channel.ChannelOption
 *  io.netty.channel.EventLoopGroup
 *  io.netty.channel.nio.NioEventLoopGroup
 *  io.netty.channel.socket.nio.NioSocketChannel
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.tcp;

import com.seer.rds.tcp.ClientChannelInitializer;
import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioSocketChannel;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class NettyTcpClient {
    private static final Logger log = LoggerFactory.getLogger(NettyTcpClient.class);
    @Autowired
    ClientChannelInitializer clientChannelInitializer;
    public static Map<String, Channel> tcpClients = new ConcurrentHashMap();
    private Channel channel;

    private final Bootstrap getBootstrap() {
        Bootstrap bootstrap = new Bootstrap();
        NioEventLoopGroup group = new NioEventLoopGroup();
        ((Bootstrap)((Bootstrap)((Bootstrap)bootstrap.group((EventLoopGroup)group)).channel(NioSocketChannel.class)).handler((ChannelHandler)this.clientChannelInitializer)).option(ChannelOption.SO_KEEPALIVE, (Object)true);
        return bootstrap;
    }

    public void connect(String host, Integer port) {
        try {
            ChannelFuture channelFuture = this.getBootstrap().connect(host, port.intValue()).syncUninterruptibly();
            if (channelFuture != null && channelFuture.isSuccess()) {
                this.channel = channelFuture.channel();
                tcpClients.put(host + ":" + port, this.channel);
                log.info("connect tcp server host = {},port = {} success", (Object)host, (Object)port);
            } else {
                log.error("connect tcp server host = {},port = {} fail", (Throwable)new Exception());
            }
        }
        catch (Exception e) {
            log.error("connect tcp server host = {},port = {} fail", (Throwable)e);
        }
    }

    public void sendMessage(String host, Integer port, Object msg) throws InterruptedException {
        log.info(String.valueOf(tcpClients));
        Channel c = (Channel)tcpClients.get(host + ":" + port);
        if (c == null) {
            this.connect(host, port);
            c = (Channel)tcpClients.get(host + ":" + port);
        }
        c.writeAndFlush(msg).sync();
    }
}

