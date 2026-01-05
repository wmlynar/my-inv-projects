/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.CoreLicInfo
 *  com.seer.rds.util.OkHttpUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import com.seer.rds.constant.ApiEnum;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CoreLicInfo {
    private static final Logger log = LoggerFactory.getLogger(CoreLicInfo.class);

    public static String getCoreLicInfo() {
        String result = null;
        try {
            result = OkHttpUtil.get((String)RootBp.getUrl((String)ApiEnum.licInfo.getUri()));
        }
        catch (Exception e) {
            log.error("getLicInfo error");
        }
        return result;
    }
}

