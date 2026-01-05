/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.TemplateNameEnum
 */
package com.seer.rds.constant;

public enum TemplateNameEnum {
    userTemplate("userTemplate", "@{task.enum.UserTemplate}"),
    generalTemplate("generalTemplate", "@{task.enum.GeneralTemplate}");

    private String name;
    private String desc;

    private TemplateNameEnum(String name, String desc) {
        this.name = name;
        this.desc = desc;
    }

    private TemplateNameEnum() {
    }

    public String getName() {
        return this.name;
    }

    public String getDesc() {
        return this.desc;
    }
}

