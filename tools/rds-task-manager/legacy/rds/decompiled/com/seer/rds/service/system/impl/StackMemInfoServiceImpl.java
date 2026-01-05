/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.StackMemInfoMapper
 *  com.seer.rds.model.serverInfo.StackMem
 *  com.seer.rds.service.system.StackMemInfoService
 *  com.seer.rds.service.system.impl.StackMemInfoServiceImpl
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.system.impl;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.StackMemInfoMapper;
import com.seer.rds.model.serverInfo.StackMem;
import com.seer.rds.service.system.StackMemInfoService;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StackMemInfoServiceImpl
implements StackMemInfoService {
    @Autowired
    private StackMemInfoMapper stackMemInfoMapper;

    public List<String> getNowStackMemoryPercent() {
        Runtime runtime = Runtime.getRuntime();
        long freeMemory = runtime.freeMemory();
        long freeMemorySizeInMegaBytes = freeMemory / 0x100000L;
        long stackMemory = runtime.totalMemory();
        long stackMemorySizeInMegaBytes = stackMemory / 0x100000L;
        long usedMemory = stackMemorySizeInMegaBytes - freeMemorySizeInMegaBytes;
        double percentMemory = (double)usedMemory / (double)stackMemorySizeInMegaBytes * 100.0;
        int roundedPercentMemory = (int)Math.round(percentMemory);
        String usedMemorystr = String.valueOf(usedMemory);
        String stackMemorySizeInMegaBytesstr = String.valueOf(stackMemorySizeInMegaBytes);
        String percentMemoryStr = String.valueOf(roundedPercentMemory);
        ArrayList<String> memoryList = new ArrayList<String>();
        memoryList.add(percentMemoryStr);
        memoryList.add(usedMemorystr);
        memoryList.add(stackMemorySizeInMegaBytesstr);
        return memoryList;
    }

    public JSONObject getAvgStackMemPercent(Date date) throws ParseException {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        calendar.set(11, 0);
        calendar.set(12, 0);
        Date startDateRow = calendar.getTime();
        calendar.set(11, 23);
        calendar.set(12, 59);
        Date endDateRow = calendar.getTime();
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy/MM/d/HH:mm");
        String formattedStartDate = dateFormat.format(startDateRow);
        String formattedEndDate = dateFormat.format(endDateRow);
        Date startDate = dateFormat.parse(formattedStartDate);
        Date endDate = dateFormat.parse(formattedEndDate);
        List stackMemList = this.stackMemInfoMapper.findByRecordedOnBetween(startDate, endDate);
        HashMap hourMemoryMap = new HashMap();
        for (StackMem stackMem : stackMemList) {
            String memoryPercentString = stackMem.getMemoryPercent().replace("%", "");
            int memoryPercent = Integer.parseInt(memoryPercentString);
            if (hourMemoryMap.containsKey(stackMem.getHour())) {
                ((List)hourMemoryMap.get(stackMem.getHour())).add(memoryPercent);
                continue;
            }
            ArrayList<Integer> memoryList = new ArrayList<Integer>();
            memoryList.add(memoryPercent);
            hourMemoryMap.put(stackMem.getHour(), memoryList);
        }
        JSONObject result = new JSONObject();
        JSONArray jsonArray = new JSONArray();
        for (Map.Entry entry : hourMemoryMap.entrySet()) {
            int hour = (Integer)entry.getKey();
            List memoryList = (List)entry.getValue();
            int sum = 0;
            Iterator iterator = memoryList.iterator();
            while (iterator.hasNext()) {
                int memory = (Integer)iterator.next();
                sum += memory;
            }
            int average = sum / memoryList.size();
            JSONObject hourData = new JSONObject();
            hourData.put("hour", (Object)hour);
            hourData.put("avgPercent", (Object)average);
            jsonArray.add((Object)hourData);
        }
        result.put("avgStackMemPercent", (Object)jsonArray);
        return result;
    }
}

