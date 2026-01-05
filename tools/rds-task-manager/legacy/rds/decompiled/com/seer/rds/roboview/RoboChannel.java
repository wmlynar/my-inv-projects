/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.NettyClientHandler
 *  com.seer.rds.roboview.RoboChannel
 *  io.netty.buffer.ByteBuf
 *  io.netty.channel.Channel
 *  io.netty.channel.ChannelFuture
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.roboview;

import com.seer.rds.roboview.NettyClientHandler;
import io.netty.buffer.ByteBuf;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RoboChannel {
    private static final Logger log = LoggerFactory.getLogger(RoboChannel.class);
    private Channel channel;
    private String responseMsg;
    private Integer rwTimeout;

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public String sendRequest(ByteBuf msg) throws InterruptedException {
        if (this.channel != null && this.channel.isActive()) {
            Channel channel = this.channel;
            synchronized (channel) {
                if (this.channel.isWritable()) {
                    ChannelFuture channelFuture = this.channel.writeAndFlush((Object)msg).sync();
                    NettyClientHandler handler = (NettyClientHandler)channelFuture.channel().pipeline().get(NettyClientHandler.class);
                    this.responseMsg = handler.getResponseLatch(this.rwTimeout.intValue()).awaitAndGetResponse();
                } else {
                    log.info("network busy cannot send");
                }
            }
        }
        msg.clear();
        return this.responseMsg;
    }

    public Channel getChannel() {
        return this.channel;
    }

    public String getResponseMsg() {
        return this.responseMsg;
    }

    public Integer getRwTimeout() {
        return this.rwTimeout;
    }

    public void setChannel(Channel channel) {
        this.channel = channel;
    }

    public void setResponseMsg(String responseMsg) {
        this.responseMsg = responseMsg;
    }

    public void setRwTimeout(Integer rwTimeout) {
        this.rwTimeout = rwTimeout;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RoboChannel)) {
            return false;
        }
        RoboChannel other = (RoboChannel)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$rwTimeout = this.getRwTimeout();
        Integer other$rwTimeout = other.getRwTimeout();
        if (this$rwTimeout == null ? other$rwTimeout != null : !((Object)this$rwTimeout).equals(other$rwTimeout)) {
            return false;
        }
        Channel this$channel = this.getChannel();
        Channel other$channel = other.getChannel();
        if (this$channel == null ? other$channel != null : !this$channel.equals(other$channel)) {
            return false;
        }
        String this$responseMsg = this.getResponseMsg();
        String other$responseMsg = other.getResponseMsg();
        return !(this$responseMsg == null ? other$responseMsg != null : !this$responseMsg.equals(other$responseMsg));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RoboChannel;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $rwTimeout = this.getRwTimeout();
        result = result * 59 + ($rwTimeout == null ? 43 : ((Object)$rwTimeout).hashCode());
        Channel $channel = this.getChannel();
        result = result * 59 + ($channel == null ? 43 : $channel.hashCode());
        String $responseMsg = this.getResponseMsg();
        result = result * 59 + ($responseMsg == null ? 43 : $responseMsg.hashCode());
        return result;
    }

    public String toString() {
        return "RoboChannel(channel=" + this.getChannel() + ", responseMsg=" + this.getResponseMsg() + ", rwTimeout=" + this.getRwTimeout() + ")";
    }
}

