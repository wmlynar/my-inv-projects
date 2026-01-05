/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.codec.FinsFrameUdpCodec
 *  com.seer.rds.util.omron.fins.core.FinsFrame
 *  com.seer.rds.util.omron.fins.core.FinsFrameBuilder
 *  io.netty.buffer.ByteBuf
 *  io.netty.buffer.Unpooled
 *  io.netty.channel.ChannelHandlerContext
 *  io.netty.channel.socket.DatagramPacket
 *  io.netty.handler.codec.MessageToMessageCodec
 *  io.netty.util.ReferenceCountUtil
 */
package com.seer.rds.util.omron.fins.codec;

import com.seer.rds.util.omron.fins.core.FinsFrame;
import com.seer.rds.util.omron.fins.core.FinsFrameBuilder;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.socket.DatagramPacket;
import io.netty.handler.codec.MessageToMessageCodec;
import io.netty.util.ReferenceCountUtil;
import java.net.InetSocketAddress;
import java.util.List;

public class FinsFrameUdpCodec
extends MessageToMessageCodec<DatagramPacket, FinsFrame> {
    private InetSocketAddress destinationAddress = null;

    public FinsFrameUdpCodec() {
    }

    public FinsFrameUdpCodec(InetSocketAddress destinationAddress) {
        this.destinationAddress = destinationAddress;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void encode(ChannelHandlerContext ctx, FinsFrame frame, List<Object> out) throws Exception {
        try {
            ByteBuf buf = Unpooled.wrappedBuffer((byte[])frame.toByteArray());
            DatagramPacket packet = new DatagramPacket(buf, this.destinationAddress);
            out.add(packet);
        }
        finally {
            ReferenceCountUtil.release((Object)frame);
        }
    }

    protected void decode(ChannelHandlerContext context, DatagramPacket packet, List<Object> out) throws Exception {
        byte[] data = new byte[((ByteBuf)packet.content()).readableBytes()];
        ((ByteBuf)packet.content()).readBytes(data);
        FinsFrame frame = FinsFrameBuilder.parseFrom((byte[])data);
        out.add(frame);
    }
}

