/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.StatLevelEnum
 *  com.seer.rds.constant.StatLevelEnum$1
 */
package com.seer.rds.constant;

import com.seer.rds.constant.StatLevelEnum;

public enum StatLevelEnum {
    Year,
    Month,
    Day,
    Hour,
    DutyDay;


    public static String getDatePatternByLevel(StatLevelEnum levelEnum) {
        switch (1.$SwitchMap$com$seer$rds$constant$StatLevelEnum[levelEnum.ordinal()]) {
            case 1: {
                return "yyyy";
            }
            case 2: {
                return "yyyy-MM";
            }
            case 3: 
            case 4: {
                return "yyyy-MM-dd";
            }
            case 5: {
                return "yyyy-MM-dd HH";
            }
        }
        return "";
    }

    public static StatLevelEnum getNextLevel(StatLevelEnum levelEnum) {
        switch (1.$SwitchMap$com$seer$rds$constant$StatLevelEnum[levelEnum.ordinal()]) {
            case 1: {
                return Month;
            }
            case 2: {
                return Day;
            }
            case 3: 
            case 4: {
                return Hour;
            }
        }
        return null;
    }

    public static String getDatePatternByLevelName(String level) {
        switch (level) {
            case "Year": {
                return "yyyy";
            }
            case "Month": {
                return "yyyy-MM";
            }
            case "Day": 
            case "DutyDay": {
                return "yyyy-MM-dd";
            }
            case "Hour": {
                return "yyyy-MM-dd HH";
            }
        }
        return "";
    }
}

