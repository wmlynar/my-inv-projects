/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsCommandCode
 *  com.seer.rds.util.omron.fins.core.FinsEndCode
 *  com.seer.rds.util.omron.fins.core.commands.FinsMemoryAreaReadResponse
 *  com.seer.rds.util.omron.fins.core.commands.SimpleFinsResponse
 */
package com.seer.rds.util.omron.fins.core.commands;

import com.seer.rds.util.omron.fins.core.FinsCommandCode;
import com.seer.rds.util.omron.fins.core.FinsEndCode;
import com.seer.rds.util.omron.fins.core.commands.SimpleFinsResponse;
import java.util.Collections;
import java.util.List;

public abstract class FinsMemoryAreaReadResponse<T>
extends SimpleFinsResponse {
    private final List<T> items;

    public FinsMemoryAreaReadResponse(FinsEndCode errorCode, List<T> items) {
        super(FinsCommandCode.MEMORY_AREA_READ, errorCode);
        this.items = items;
    }

    public List<T> getItems() {
        return Collections.unmodifiableList(this.items);
    }
}

