/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.TimePeriod
 *  com.seer.rds.util.TimeUtils
 *  com.seer.rds.util.server.DateUtils
 *  org.apache.commons.collections.MapUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import com.seer.rds.model.stat.TimePeriod;
import com.seer.rds.util.server.DateUtils;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.apache.commons.collections.MapUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class TimeUtils {
    private static final Logger log = LoggerFactory.getLogger(TimeUtils.class);

    public static Date getExtremumDate(Boolean maxOrMin, Date ... dates) {
        ArrayList<Date> dates1 = new ArrayList<Date>(dates.length);
        for (Date date : dates) {
            if (date == null) continue;
            dates1.add(date);
        }
        if (dates1.size() == 0) {
            return null;
        }
        if (maxOrMin.booleanValue()) {
            return (Date)Collections.max(dates1);
        }
        return (Date)Collections.min(dates1);
    }

    public static Map<Date, Date> getTimePeriodsUnion(Boolean mixedOrUnion, List<TimePeriod> periods) {
        periods.sort(Comparator.comparing(TimePeriod::getBeginTime));
        TreeMap<Date, Date> dateMap = new TreeMap<Date, Date>();
        for (TimePeriod period : periods) {
            Date startTime = period.getBeginTime();
            Date endTime = period.getEndTime();
            if (MapUtils.isEmpty(dateMap)) {
                dateMap.put(startTime, endTime);
            }
            TreeMap<Date, Date> tempMap = new TreeMap<Date, Date>();
            Iterator iterator = dateMap.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry entry = iterator.next();
                Date start = (Date)entry.getKey();
                Date end = (Date)entry.getValue();
                if (startTime.before(end) && endTime.after(start) || start.before(endTime) && end.after(startTime)) {
                    iterator.remove();
                    if (mixedOrUnion.booleanValue()) {
                        tempMap.put(TimeUtils.getExtremumDate((Boolean)true, (Date[])new Date[]{startTime, start}), TimeUtils.getExtremumDate((Boolean)false, (Date[])new Date[]{endTime, end}));
                        continue;
                    }
                    tempMap.put(TimeUtils.getExtremumDate((Boolean)false, (Date[])new Date[]{startTime, start}), TimeUtils.getExtremumDate((Boolean)true, (Date[])new Date[]{endTime, end}));
                    continue;
                }
                if (iterator.hasNext()) continue;
                tempMap.put(startTime, endTime);
            }
            dateMap.putAll(tempMap);
        }
        return dateMap;
    }

    public static Date transferString2Date(String s) {
        Date date = new Date();
        try {
            date = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(s);
        }
        catch (ParseException e) {
            log.error("\u65f6\u95f4\u8f6c\u6362\u9519\u8bef, string = {}", (Object)s, (Object)e.getMessage());
        }
        return date;
    }

    public static String transferDate2String(Date date) {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(date);
    }

    public static void main(String[] args) {
        ArrayList<TimePeriod> list = new ArrayList<TimePeriod>();
        list.add(new TimePeriod(TimeUtils.transferString2Date((String)"2022-12-13 11:20:00"), TimeUtils.transferString2Date((String)"2022-12-13 11:29:15")));
        list.add(new TimePeriod(TimeUtils.transferString2Date((String)"2022-12-13 11:33:00"), TimeUtils.transferString2Date((String)"2022-12-13 11:34:35")));
        Map dateMap1 = TimeUtils.getTimePeriodsUnion((Boolean)true, list);
        for (Map.Entry entry : dateMap1.entrySet()) {
            long l = ((Date)entry.getValue()).getTime() - ((Date)entry.getKey()).getTime();
            System.out.println(l);
            System.out.println("\u4ea4\u96c6\u5f00\u59cb\u65f6\u95f4\uff1a" + TimeUtils.transferDate2String((Date)((Date)entry.getKey())) + "      \u4ea4\u96c6\u7ed3\u675f\u65f6\u95f4\uff1a" + TimeUtils.transferDate2String((Date)((Date)entry.getValue())));
        }
        System.out.println("=====================================================================");
        Map dateMap2 = TimeUtils.getTimePeriodsUnion((Boolean)false, list);
        BigDecimal duration = BigDecimal.ZERO;
        for (Map.Entry entry : dateMap2.entrySet()) {
            duration = duration.add(BigDecimal.valueOf(((Date)entry.getValue()).getTime() - ((Date)entry.getKey()).getTime()));
            System.out.println(duration);
            System.out.println("\u5e76\u96c6\u5f00\u59cb\u65f6\u95f4\uff1a" + TimeUtils.transferDate2String((Date)((Date)entry.getKey())) + "      \u5e76\u96c6\u7ed3\u675f\u65f6\u95f4\uff1a" + TimeUtils.transferDate2String((Date)((Date)entry.getValue())));
        }
        System.out.println(duration);
    }

    public static long getNextMillisEndWithMinute0or5(Date baseTime) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(baseTime);
        int minute = calendar.get(12);
        if (minute < 55) {
            int add = minute % 10 < 5 ? 5 - minute % 10 : 10 - minute % 10;
            calendar.add(12, add);
            calendar.set(13, 0);
            calendar.set(14, 0);
            return calendar.getTime().getTime();
        }
        calendar.set(12, 0);
        calendar.set(13, 0);
        calendar.set(14, 0);
        Date endTime = DateUtils.addHours((Date)calendar.getTime(), (int)1);
        return endTime.getTime();
    }
}

