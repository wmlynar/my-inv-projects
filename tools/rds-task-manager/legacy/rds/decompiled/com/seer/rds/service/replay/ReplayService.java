/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.service.replay.ReplayService
 *  com.seer.rds.util.DateUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.RdsServer
 *  org.apache.commons.io.input.ReversedLinesFileReader
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.replay;

import com.alibaba.fastjson.JSON;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.util.DateUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.websocket.RdsServer;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.commons.io.input.ReversedLinesFileReader;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ReplayService {
    private static final Logger log = LoggerFactory.getLogger(ReplayService.class);
    @Autowired
    private PropConfig propConfig;

    public Map<String, String> getRobotStatusFromFile(String path, String startDate) {
        return this.getReplayDateFromFile(path, startDate);
    }

    public Map<String, String> getSitesFromFile(String path, String startDate) {
        return this.getReplayDateFromFile(path, startDate);
    }

    private Map<String, String> getReplayDateFromFile(String path, String startDate) {
        String fistLine;
        int secondsToAdd = 30;
        LinkedHashMap<String, String> resMap = new LinkedHashMap<String, String>();
        String endDate = DateUtil.addSeconds((String)startDate, (int)secondsToAdd);
        String startFileName = startDate.substring(0, startDate.length() - 3).replaceAll(" ", "_").replaceAll(":", "-") + "-00.log";
        String completeStartFileName = path + startFileName;
        String endFileName = endDate.substring(0, endDate.length() - 3).replaceAll(" ", "_").replaceAll(":", "-") + "-00.log";
        String completeEndFileName = path + endFileName;
        List startFileList = this.readFromFileBetween(completeStartFileName, startDate, endDate);
        ArrayList<String> lines = new ArrayList<String>(startFileList);
        if (!startFileName.equals(endFileName)) {
            List endFileList = this.readFromFileBetween(completeEndFileName, startDate, endDate);
            lines.addAll(endFileList);
        }
        if (!((Object)lines).toString().contains(startDate) && StringUtils.isNotEmpty((CharSequence)(fistLine = this.getNearestDataBeforeStartDate(path, startFileName, completeStartFileName, startDate)))) {
            lines.add(0, fistLine);
        }
        Pattern pattern = Pattern.compile("(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\s+(.*)");
        for (String line : lines) {
            Matcher matcher = pattern.matcher(line);
            if (!matcher.matches()) continue;
            resMap.put(matcher.group(1), matcher.group(2));
        }
        return resMap;
    }

    private List<String> readFromFileBetween(String completeFileName, String startDate, String endDate) {
        ArrayList<String> lines = new ArrayList<String>();
        try (BufferedReader reader = new BufferedReader(new FileReader(completeFileName));){
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.substring(0, 19).compareTo(startDate) < 0 || line.substring(0, 19).compareTo(endDate) > 0) continue;
                lines.add(line);
            }
        }
        catch (FileNotFoundException e) {
            log.info("no such file:" + completeFileName);
        }
        catch (IOException e) {
            log.error("read file error : " + e);
        }
        return lines;
    }

    public String getNearestFullFileName(String path, String fileName) {
        String fmt = "yyyy-MM-dd_HH-mm-ss";
        Date fileNameDate = DateUtil.fmt2Date((String)fileName.split("\\.")[0], (String)fmt);
        File folder = new File(path);
        String[] fileNames = folder.list();
        if (null != fileNames) {
            Pattern pattern = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}\\.(scene|log)$");
            List collect = Arrays.stream(fileNames).filter(pattern.asPredicate()).sorted(Comparator.reverseOrder()).collect(Collectors.toList());
            for (String name : collect) {
                Date date = DateUtil.fmt2Date((String)name.split("\\.")[0], (String)fmt);
                if (!fileNameDate.after(date)) continue;
                File file = new File(path + name);
                if (file.exists() && file.length() != 0L) {
                    return path + name;
                }
                String completeFileName = this.getNearestFullFileName(path, name + ".log");
                return StringUtils.isEmpty((CharSequence)completeFileName) ? "" : completeFileName;
            }
        }
        return "";
    }

    private String readLastLine(String fileName) {
        String lastLine = "";
        try (ReversedLinesFileReader reversedLinesReader = new ReversedLinesFileReader(new File(fileName), StandardCharsets.UTF_8);){
            lastLine = reversedLinesReader.readLine();
        }
        catch (Exception e) {
            log.error("file read last line error, msg:{}", (Object)e.getMessage());
        }
        return lastLine;
    }

    private String getNearestDataBeforeStartDate(String path, String fileName, String startFileName, String startDate) {
        String nearestFileName;
        String line = "";
        try (ReversedLinesFileReader reversedLinesReader = new ReversedLinesFileReader(new File(startFileName), StandardCharsets.UTF_8);){
            String currLine;
            while ((currLine = reversedLinesReader.readLine()) != null) {
                if (currLine.substring(0, 19).compareTo(startDate) >= 0) continue;
                line = currLine;
                break;
            }
        }
        catch (Exception e) {
            log.warn("file read last line error, msg:{}", (Object)e.getMessage());
        }
        if (StringUtils.isEmpty((CharSequence)line) && StringUtils.isNotEmpty((CharSequence)(nearestFileName = this.getNearestFullFileName(path, fileName)))) {
            line = this.readLastLine(nearestFileName);
        }
        return line;
    }

    private List<String> getAGVOrSitesOrScenesFileNamesBetween(String startTime, String endTime, String folder) {
        ArrayList<String> names = new ArrayList<String>();
        String dateFmt = "yyyy-MM-dd HH:mm:ss";
        Date start = DateUtil.fmt2Date((String)startTime, (String)dateFmt);
        Date end = DateUtil.fmt2Date((String)endTime, (String)dateFmt);
        File fileFolder = new File(folder);
        String prefix = fileFolder.getName() + File.separator;
        String[] fileNames = fileFolder.list();
        if (fileNames != null) {
            Pattern pattern = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}\\.(scene|log)$");
            List nameList = Arrays.stream(fileNames).filter(pattern.asPredicate()).sorted(Comparator.naturalOrder()).collect(Collectors.toList());
            for (String name : nameList) {
                Date date = DateUtil.fmt2Date((String)name.split("\\.")[0], (String)"yyyy-MM-dd_HH-mm-ss");
                if (start.compareTo(date) > 0 || end.compareTo(date) < 0) continue;
                names.add(prefix + name);
            }
            String nearestFullFileName = this.getNearestFullFileName(folder, DateUtil.fmtDate2String((Date)start, (String)"yyyy-MM-dd_HH-mm-ss") + ".log");
            if (StringUtils.isNotEmpty((CharSequence)nearestFullFileName)) {
                String s = nearestFullFileName.substring(nearestFullFileName.lastIndexOf("/") + 1);
                names.add(0, prefix + s);
            }
        }
        return names;
    }

    public List<String> getFileNamesBetween(String startTime, String endTime) {
        ArrayList<String> filesToZip = new ArrayList<String>();
        if (StringUtils.isNotEmpty((CharSequence)startTime) && StringUtils.isNotEmpty((CharSequence)endTime)) {
            String replayRobotStatusesDir = this.propConfig.getReplayRobotStatusesDir();
            String replaySitesDir = this.propConfig.getReplaySitesDir();
            String replayScenesDir = this.propConfig.getReplayScenesDir();
            List agvFileNames = this.getAGVOrSitesOrScenesFileNamesBetween(startTime, endTime, replayRobotStatusesDir);
            List sitesFileNames = this.getAGVOrSitesOrScenesFileNamesBetween(startTime, endTime, replaySitesDir);
            List scenesFileNames = this.getAGVOrSitesOrScenesFileNamesBetween(startTime, endTime, replayScenesDir);
            filesToZip.addAll(agvFileNames);
            filesToZip.addAll(sitesFileNames);
            filesToZip.addAll(scenesFileNames);
        }
        return filesToZip;
    }

    public void sendFileNameBySocket(String dateTime, String from, String uid) {
        String fileName;
        String nearestFileName;
        Object replayScenesDir = this.propConfig.getReplayScenesDir();
        if ("others".equals(from)) {
            replayScenesDir = this.propConfig.getReplayUploadDir() + "scenes/";
        }
        if (StringUtils.isNotEmpty((CharSequence)(nearestFileName = this.getNearestFullFileName((String)replayScenesDir, fileName = dateTime.replaceAll(" ", "_").replaceAll(":", "-") + ".scene")))) {
            nearestFileName = nearestFileName.substring(nearestFileName.length() - 25);
        }
        HashMap<String, String> data = new HashMap<String, String>();
        data.put("sceneName", nearestFileName);
        data.put("uid", uid);
        ResultVo success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_LOCAL_REPLAY_SCENE_CHANGE, data);
        if ("others".equals(from)) {
            success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_OTHERS_REPLAY_SCENE_CHANGE, data);
        }
        RdsServer websocketServer = (RdsServer)SpringUtil.getBean(RdsServer.class);
        websocketServer.sendMessage(JSON.toJSONString((Object)success));
    }
}

