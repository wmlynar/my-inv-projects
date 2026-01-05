/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.BlockVo
 *  com.seer.rds.vo.core.CurrentOrderVo
 */
package com.seer.rds.vo.core;

import com.seer.rds.vo.core.BlockVo;
import java.util.List;

public class CurrentOrderVo {
    private List<BlockVo> blocks;
    private List<Object> candidates;
    private Boolean complete;
    private String deadline;
    private String group;
    private String id;
    private List<Object> keyRoute;
    private String msg;
    private Integer priority;
    private String state;
    private List<String> tag;
    private String vehicle;
}

