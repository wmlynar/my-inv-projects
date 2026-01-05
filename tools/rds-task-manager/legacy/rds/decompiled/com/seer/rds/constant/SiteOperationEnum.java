/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.SiteOperationEnum
 */
package com.seer.rds.constant;

/*
 * Exception performing whole class analysis ignored.
 */
public enum SiteOperationEnum {
    UNLOCK(0, "@{task.enum.lock}"),
    LOCK(1, "@{task.enum.unLock}");

    private int status;
    private String desc;

    public static SiteOperationEnum getSiteOperationEnum(int status) {
        SiteOperationEnum[] values;
        for (SiteOperationEnum e : values = SiteOperationEnum.values()) {
            if (e.getStatus() != status) continue;
            return e;
        }
        return null;
    }

    private SiteOperationEnum(int status, String desc) {
        this.status = status;
        this.desc = desc;
    }

    private SiteOperationEnum() {
    }

    public int getStatus() {
        return this.status;
    }

    public String getDesc() {
        return this.desc;
    }
}

