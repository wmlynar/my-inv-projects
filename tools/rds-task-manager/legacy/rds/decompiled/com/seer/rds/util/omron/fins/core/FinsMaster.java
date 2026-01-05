/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.Bit
 *  com.seer.rds.util.omron.fins.core.FinsIoAddress
 *  com.seer.rds.util.omron.fins.core.FinsMaster
 *  com.seer.rds.util.omron.fins.core.FinsMasterException
 *  com.seer.rds.util.omron.fins.core.FinsNodeAddress
 */
package com.seer.rds.util.omron.fins.core;

import com.seer.rds.util.omron.fins.core.Bit;
import com.seer.rds.util.omron.fins.core.FinsIoAddress;
import com.seer.rds.util.omron.fins.core.FinsMasterException;
import com.seer.rds.util.omron.fins.core.FinsNodeAddress;
import java.util.List;

public interface FinsMaster
extends AutoCloseable {
    public void connect() throws FinsMasterException;

    public void disconnect();

    public short readWord(FinsNodeAddress var1, FinsIoAddress var2) throws FinsMasterException;

    public List<Short> readWords(FinsNodeAddress var1, FinsIoAddress var2, short var3) throws FinsMasterException;

    public Bit readBit(FinsNodeAddress var1, FinsIoAddress var2) throws FinsMasterException;

    public List<Bit> readBits(FinsNodeAddress var1, FinsIoAddress var2, short var3) throws FinsMasterException;

    public String readString(FinsNodeAddress var1, FinsIoAddress var2, short var3) throws FinsMasterException;

    public Boolean writeWord(FinsNodeAddress var1, FinsIoAddress var2, Short var3) throws FinsMasterException;

    public Boolean writeWords(FinsNodeAddress var1, FinsIoAddress var2, List<Short> var3) throws FinsMasterException;

    public Boolean writeBit(FinsNodeAddress var1, FinsIoAddress var2, Boolean var3) throws FinsMasterException;

    public Boolean writeBits(FinsNodeAddress var1, FinsIoAddress var2, List<Boolean> var3) throws FinsMasterException;
}

