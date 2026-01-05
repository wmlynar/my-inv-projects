/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.Bit
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.FinsFrame
 *  com.seer.rds.util.omron.fins.core.FinsFrameBuilder
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.FinsMaster
 *  com.seer.rds.util.omron.fins.core.FinsMasterException
 *  com.seer.rds.util.omron.fins.core.FinsNodeAddress
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadBitResponse
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadCommand
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadWordResponse
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteBitCommand
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteResponse
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteWordCommand
 *  com.seer.rds.util.omron.fins.udp.master.FinsNettyUdpMaster
 *  io.netty.bootstrap.Bootstrap
 *  io.netty.channel.Channel
 *  io.netty.channel.ChannelHandler
 *  io.netty.channel.ChannelOption
 *  io.netty.channel.EventLoopGroup
 *  io.netty.channel.nio.NioEventLoopGroup
 *  io.netty.channel.socket.nio.NioDatagramChannel
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.omron.fins.udp.master;

import com.seer.rds.util.omron.fins.core.Bit;
import com.seer.rds.util.omron.fins.core.FinsEndCode;
import com.seer.rds.util.omron.fins.core.FinsFrame;
import com.seer.rds.util.omron.fins.core.FinsFrameBuilder;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.FinsMaster;
import com.seer.rds.util.omron.fins.core.FinsMasterException;
import com.seer.rds.util.omron.fins.core.FinsNodeAddress;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadBitResponse;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadCommand;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadWordResponse;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteBitCommand;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteResponse;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteWordCommand;
import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioDatagramChannel;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FinsNettyUdpMaster
implements FinsMaster {
    private static final Logger log = LoggerFactory.getLogger(FinsNettyUdpMaster.class);
    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private final InetSocketAddress destinationAddress;
    private final FinsNodeAddress nodeAddress;
    private NioEventLoopGroup workerGroup;
    private Bootstrap bootstrap;
    private Channel channel;
    private final AtomicInteger serviceAddress = new AtomicInteger(0);
    private CompletableFuture<FinsFrame> sendFuture;
    private int retries = 3;

    public FinsNettyUdpMaster(InetSocketAddress destinationAddress, FinsNodeAddress nodeAddress) {
        this(destinationAddress, nodeAddress, 3);
    }

    public FinsNettyUdpMaster(InetSocketAddress destinationAddress, FinsNodeAddress nodeAddress, int retries) {
        this.nodeAddress = nodeAddress;
        if (retries > 0) {
            this.retries = retries;
        }
        this.workerGroup = new NioEventLoopGroup();
        this.bootstrap = new Bootstrap();
        ((Bootstrap)((Bootstrap)((Bootstrap)this.bootstrap.group((EventLoopGroup)this.workerGroup)).channel(NioDatagramChannel.class)).option(ChannelOption.SO_BROADCAST, (Object)true)).handler((ChannelHandler)new /* Unavailable Anonymous Inner Class!! */);
        this.destinationAddress = destinationAddress;
    }

    public void connect() throws FinsMasterException {
        if (this.bootstrap == null) {
            throw new FinsMasterException("FINS master bootstrap not correctly set");
        }
        try {
            this.channel = this.bootstrap.connect((SocketAddress)this.destinationAddress).sync().channel();
            this.logger.debug(this.channel.toString());
        }
        catch (InterruptedException ex) {
            throw new FinsMasterException("FINS master connection operation interrupted", (Throwable)ex);
        }
    }

    public void disconnect() {
        Optional.of(this.bootstrap.group()).ifPresent(g -> {
            try {
                g.shutdownGracefully().sync();
            }
            catch (InterruptedException ex) {
                this.logger.error("FINS master channel close operation interrupted", (Throwable)ex);
            }
        });
    }

    public short readWord(FinsNodeAddress destination, FinsIoAddress address) throws FinsMasterException {
        return (Short)this.readWords(destination, address, (short)1).get(0);
    }

    public List<Short> readWords(FinsNodeAddress destination, FinsIoAddress address, short itemCount) throws FinsMasterException {
        FinsMemoryAreaReadCommand command = new FinsMemoryAreaReadCommand(address, itemCount);
        FinsFrame frame = new FinsFrameBuilder().setDestinationAddress(destination).setSourceAddress(this.nodeAddress).setServiceAddress(this.getNextServiceAddress()).setData(command.getBytes()).build();
        FinsFrame replyFrame = this.send(frame);
        byte[] data = replyFrame.getData();
        FinsMemoryAreaReadWordResponse response = FinsMemoryAreaReadWordResponse.parseFrom((byte[])data, (short)itemCount);
        List items = response.getItems();
        if (response.getEndCode() != FinsEndCode.NORMAL_COMPLETION) {
            throw new FinsMasterException(String.format("%s", response.getEndCode()));
        }
        return items;
    }

    public Bit readBit(FinsNodeAddress destination, FinsIoAddress address) throws FinsMasterException {
        return (Bit)this.readBits(destination, address, (short)1).get(0);
    }

    public List<Bit> readBits(FinsNodeAddress destination, FinsIoAddress address, short itemCount) throws FinsMasterException {
        FinsMemoryAreaReadCommand command = new FinsMemoryAreaReadCommand(address, itemCount);
        FinsFrame frame = new FinsFrameBuilder().setDestinationAddress(destination).setSourceAddress(this.nodeAddress).setServiceAddress(this.getNextServiceAddress()).setData(command.getBytes()).build();
        FinsFrame replyFrame = this.send(frame);
        byte[] data = replyFrame.getData();
        FinsMemoryAreaReadBitResponse response = FinsMemoryAreaReadBitResponse.parseFrom((byte[])data, (short)itemCount);
        List items = response.getItems();
        if (response.getEndCode() != FinsEndCode.NORMAL_COMPLETION) {
            throw new FinsMasterException(String.format("%s", response.getEndCode()));
        }
        return items;
    }

    public String readString(FinsNodeAddress destination, FinsIoAddress address, short wordLength) throws FinsMasterException {
        List words = this.readWords(destination, address, wordLength);
        StringBuilder stringBuffer = new StringBuilder(wordLength * 2);
        byte[] bytes = new byte[2];
        for (Short s : words) {
            bytes[1] = (byte)(s & 0xFF);
            bytes[0] = (byte)(s >> 8 & 0xFF);
            stringBuffer.append(new String(bytes, StandardCharsets.US_ASCII));
        }
        return stringBuffer.toString();
    }

    public Boolean writeWord(FinsNodeAddress destination, FinsIoAddress address, Short value) throws FinsMasterException {
        return this.writeWords(destination, address, Collections.singletonList(value));
    }

    public Boolean writeWords(FinsNodeAddress destination, FinsIoAddress address, List<Short> values) throws FinsMasterException {
        FinsMemoryAreaWriteWordCommand command = new FinsMemoryAreaWriteWordCommand(address, values);
        FinsFrame frame = new FinsFrameBuilder().setDestinationAddress(destination).setSourceAddress(this.nodeAddress).setServiceAddress(this.getNextServiceAddress()).setData(command.getBytes()).build();
        FinsFrame replyFrame = this.send(frame);
        FinsMemoryAreaWriteResponse response = FinsMemoryAreaWriteResponse.parseFrom((byte[])replyFrame.getData());
        if (response.getEndCode() != FinsEndCode.NORMAL_COMPLETION) {
            throw new FinsMasterException(String.format("%s", response.getEndCode()));
        }
        return true;
    }

    public Boolean writeBit(FinsNodeAddress destination, FinsIoAddress address, Boolean value) throws FinsMasterException {
        return this.writeBits(destination, address, Collections.singletonList(value));
    }

    public Boolean writeBits(FinsNodeAddress destination, FinsIoAddress address, List<Boolean> values) throws FinsMasterException {
        FinsMemoryAreaWriteBitCommand command = new FinsMemoryAreaWriteBitCommand(address, values);
        FinsFrame frame = new FinsFrameBuilder().setDestinationAddress(destination).setSourceAddress(this.nodeAddress).setServiceAddress(this.getNextServiceAddress()).setData(command.getBytes()).build();
        FinsFrame replyFrame = this.send(frame);
        FinsMemoryAreaWriteResponse response = FinsMemoryAreaWriteResponse.parseFrom((byte[])replyFrame.getData());
        if (response.getEndCode() != FinsEndCode.NORMAL_COMPLETION) {
            throw new FinsMasterException(String.format("%s", response.getEndCode()));
        }
        return true;
    }

    private synchronized FinsFrame send(FinsFrame frame) {
        return this.send(frame, 0);
    }

    private synchronized FinsFrame send(FinsFrame frame, int attempt) {
        try {
            this.sendFuture = new CompletableFuture();
            this.channel.writeAndFlush((Object)frame);
            FinsFrame replyFrame = (FinsFrame)this.sendFuture.get(1000L, TimeUnit.MILLISECONDS);
            return replyFrame;
        }
        catch (TimeoutException e) {
            if (attempt < this.retries) {
                return this.send(frame, ++attempt);
            }
            this.logger.error("Netty send error", (Throwable)e);
            return null;
        }
        catch (InterruptedException | ExecutionException e) {
            this.logger.error("Netty send error", (Throwable)e);
            return null;
        }
    }

    private byte getNextServiceAddress() {
        return (byte)this.serviceAddress.incrementAndGet();
    }

    protected CompletableFuture<FinsFrame> getSendFuture() {
        return this.sendFuture;
    }

    public void close() {
        this.disconnect();
    }
}

