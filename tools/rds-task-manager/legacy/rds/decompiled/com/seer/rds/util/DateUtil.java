/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.DateUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DateUtil {
    private static final Logger log = LoggerFactory.getLogger(DateUtil.class);

    public static String fmtCurrDate(String fmtStr) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(fmtStr);
        return now.format(formatter);
    }

    public static String fmtDate2String(Date dateTime, String fmtStr) {
        SimpleDateFormat sdf = new SimpleDateFormat(fmtStr);
        return sdf.format(dateTime);
    }

    public static Date fmt2Date(String dateString, String fmtStr) {
        SimpleDateFormat sdf = new SimpleDateFormat(fmtStr);
        Date date = null;
        try {
            date = sdf.parse(dateString);
        }
        catch (ParseException e) {
            log.error("fmtToDate error: " + e);
        }
        return date;
    }

    public static String addSeconds(String startDate, int secondsToAdd) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime dateTime = LocalDateTime.parse(startDate, formatter);
        Duration duration = Duration.ofSeconds(secondsToAdd);
        LocalDateTime newDateTime = dateTime.plus(duration);
        return formatter.format(newDateTime);
    }
}

