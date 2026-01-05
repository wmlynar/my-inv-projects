/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsFrame
 *  com.seer.rds.util.omron.fins.udp.master.FinsMasterHandler
 *  com.seer.rds.util.omron.fins.udp.master.FinsNettyUdpMaster
 *  io.netty.channel.ChannelHandlerContext
 *  io.netty.channel.SimpleChannelInboundHandler
 *  io.netty.util.ReferenceCountUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.omron.fins.udp.master;

import com.seer.rds.util.omron.fins.core.FinsFrame;
import com.seer.rds.util.omron.fins.udp.master.FinsNettyUdpMaster;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.util.ReferenceCountUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FinsMasterHandler
extends SimpleChannelInboundHandler<FinsFrame> {
    static final Logger logger = LoggerFactory.getLogger(FinsMasterHandler.class);
    private final FinsNettyUdpMaster master;

    public FinsMasterHandler(FinsNettyUdpMaster master) {
        this.master = master;
    }

    protected void channelRead0(ChannelHandlerContext ctx, FinsFrame frame) throws Exception {
        this.master.getSendFuture().complete(frame);
        ReferenceCountUtil.release((Object)frame);
    }
}

