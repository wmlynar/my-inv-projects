/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandBuilder
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsIoMemoryArea
 *  com.seer.rds.util.omron.fins.core.commands.FinsCommand
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteWordCommand$Builder
 *  com.seer.rds.util.omron.fins.core.commands.FinsUnsupportedCommandException
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.omron.fins.core;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsIoMemoryArea;
import com.seer.rds.util.omron.fins.core.commands.FinsCommand;
import com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaWriteWordCommand;
import com.seer.rds.util.omron.fins.core.commands.FinsUnsupportedCommandException;
import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FinsCommandBuilder {
    private static final Logger logger = LoggerFactory.getLogger(FinsCommandBuilder.class);
    private static final FinsCommandBuilder INSTANCE = new FinsCommandBuilder();
    private static Map<FinsCommandCode, FinsCommandBuilder> commandBuilders = new HashMap();

    private FinsCommandBuilder() {
    }

    public static FinsCommandBuilder getInstance() {
        return INSTANCE;
    }

    public static void registerCommandBuilder(FinsCommandCode finsCommandCode, FinsCommandBuilder commandBuilder) {
        logger.debug(String.format("Registering command handler for command code 0x%04x", finsCommandCode));
        commandBuilders.put(finsCommandCode, commandBuilder);
    }

    public FinsCommand parseFrom(byte[] commandPayload) throws FinsUnsupportedCommandException {
        ByteBuffer buf = ByteBuffer.wrap(commandPayload);
        short commandCodeValue = buf.getShort();
        FinsCommandCode commandCode = (FinsCommandCode)FinsCommandCode.valueOf((short)commandCodeValue).get();
        if (commandCode == FinsCommandCode.MEMORY_AREA_WRITE) {
            FinsIoMemoryArea memoryAreaCode = (FinsIoMemoryArea)FinsIoMemoryArea.valueOf((byte)buf.get()).get();
            switch (memoryAreaCode.getDataByteSize()) {
                case 1: {
                    break;
                }
                case 2: {
                    return FinsMemoryAreaWriteWordCommand.Builder.parseFrom((byte[])commandPayload);
                }
            }
        }
        throw new FinsUnsupportedCommandException();
    }
}

