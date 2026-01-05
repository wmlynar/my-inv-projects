/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TemplateTypeEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum TemplateTypeEnum {
    generalTemplate_AutoCall(Integer.valueOf(1), "AutoCreateByModbusTcp", "@{task.enum.AutoCall}");

    private Integer type;
    private String label;
    private String desc;

    public static String getLabelByType(int type) {
        TemplateTypeEnum[] values;
        for (TemplateTypeEnum e : values = TemplateTypeEnum.values()) {
            if (e.getType() != type) continue;
            return e.getLabel();
        }
        return null;
    }

    public static String getDescByType(int type) {
        TemplateTypeEnum[] values;
        for (TemplateTypeEnum e : values = TemplateTypeEnum.values()) {
            if (e.getType() != type) continue;
            return e.getDesc();
        }
        return null;
    }

    private TemplateTypeEnum(Integer type, String label, String desc) {
        this.type = type;
        this.label = label;
        this.desc = desc;
    }

    private TemplateTypeEnum() {
    }

    public Integer getType() {
        return this.type;
    }

    public String getLabel() {
        return this.label;
    }

    public String getDesc() {
        return this.desc;
    }
}

