/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.codec.FinsFrameCodec
 *  com.seer.rds.util.omron.fins.core.FinsFrame
 *  com.seer.rds.util.omron.fins.core.FinsFrameBuilder
 *  io.netty.buffer.ByteBuf
 *  io.netty.channel.ChannelHandlerContext
 *  io.netty.handler.codec.ByteToMessageCodec
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.omron.fins.codec;

import com.seer.rds.util.omron.fins.core.FinsFrame;
import com.seer.rds.util.omron.fins.core.FinsFrameBuilder;
import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.ByteToMessageCodec;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FinsFrameCodec
extends ByteToMessageCodec<FinsFrame> {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    protected void encode(ChannelHandlerContext context, FinsFrame finsFrame, ByteBuf out) throws Exception {
        out.writeBytes(finsFrame.toByteArray());
        this.logger.debug("Encoded FINS frame");
        this.logger.debug(finsFrame.toString());
    }

    protected void decode(ChannelHandlerContext context, ByteBuf in, List<Object> out) throws Exception {
        byte[] data = new byte[in.readableBytes()];
        in.readBytes(data);
        FinsFrame finsFrame = FinsFrameBuilder.parseFrom((byte[])data);
        this.logger.debug("Decoded FINS frame");
        this.logger.debug(finsFrame.toString());
        out.add(finsFrame);
    }
}

