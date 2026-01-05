/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.WorkSiteDto
 *  javax.persistence.Column
 */
package com.seer.rds.vo;

import javax.persistence.Column;

public class WorkSiteDto {
    private String id;
    private String project_id;
    private String site_id;
    private Integer working;
    private Integer locked;
    private String locked_by;
    private Integer preparing;
    private Integer filled;
    private Integer disabled;
    private String content;
    private String area;
    private Integer row_num;
    private Integer col_num;
    private Integer level;
    private Integer depth;
    private Integer no;
    @Column(nullable=true, columnDefinition="decimal(13,3) DEFAULT NULL")
    private Double income_cost;
    @Column(nullable=true, columnDefinition="decimal(13,3) DEFAULT NULL")
    private Double outcome_cost;
    private String agv_id;
    private String tags;
    private Integer type;
    private Double x;
    private Double y;
    private Double z;

    public WorkSiteDto(String id, String siteId, Integer working, Integer locked, Integer preparing, Integer filled, Integer disabled, String content, String area, Integer rowNum, Integer colNum, Integer level, Integer depth, Integer no, String agvId, String tags, Integer type) {
        this.id = id;
        this.site_id = siteId;
        this.working = working;
        this.locked = locked;
        this.preparing = preparing;
        this.filled = filled;
        this.disabled = disabled;
        this.content = content;
        this.area = area;
        this.row_num = rowNum;
        this.col_num = colNum;
        this.level = level;
        this.depth = depth;
        this.no = no;
        this.agv_id = agvId;
        this.tags = tags;
        this.type = type;
    }
}

