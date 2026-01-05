/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.Archiving.ArchivingService
 *  org.apache.commons.codec.digest.DigestUtils
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.boot.ApplicationArguments
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.Archiving;

import com.alibaba.fastjson.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Service;

@Service
public class ArchivingService {
    private static final Logger log = LoggerFactory.getLogger(ArchivingService.class);
    public static final String HISTORY_BIZCONFIG = "bizConfig";
    public static final String HISTORY_SCRIPT = "script";
    public static final String HISTORY_CONFIG = "config";
    public static final String APP_FILENAME_SUFFIX_YML = ".yml";
    public static final String APP_FILENAME_SUFFIX_JS = ".js";
    public static final String APP_FILENAME_SUFFIX_TASK = ".task";
    public static final String APP_FILENAME_DASH = "-";
    public static final String APP_FILE_APPLICATION = "application";
    public static final String APP_FILE_APPLICATION_BIZ = "application-biz";
    public static final String APP_FILE_SLASH = "/";
    public static final String APP_FILE_APPLICATION_YML = "application.yml";
    public static final String APP_FILE_APPLICATION_BIZ_YML = "application-biz.yml";
    public static final String HISTORY_TASK = "task";
    public static final String DATABASE_DATA = "data";
    @Autowired
    private ApplicationArguments arguments;

    public List<String> historyFileList(String filename) throws IOException {
        Path folderPath = Paths.get(filename, new String[0]);
        ArrayList<String> historyFileList = new ArrayList<String>();
        if (Files.exists(folderPath, new LinkOption[0]) && Files.isDirectory(folderPath, new LinkOption[0])) {
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(folderPath);){
                for (Path entry : stream) {
                    String fileName = entry.getFileName().toString();
                    historyFileList.add(fileName);
                }
            }
        }
        return historyFileList;
    }

    public void sortOneList(List<String> historyFileList) {
        Collections.sort(historyFileList, Collections.reverseOrder(String::compareTo));
    }

    public List<String> getOneSortedHistoryList(String filename) throws IOException {
        List historyFileList = this.historyFileList(filename);
        this.sortOneList(historyFileList);
        return historyFileList;
    }

    public List<List<String>> getSomeSortedHistoryList(String filename) throws IOException {
        List historyFileList = this.historyFileList(filename);
        Collections.reverse(historyFileList);
        HashMap<String, List> map = new HashMap<String, List>();
        for (String fileName : historyFileList) {
            String[] parts = fileName.split(APP_FILENAME_DASH);
            String key = parts[0];
            List value = map.computeIfAbsent(key, k -> new ArrayList());
            value.add(fileName);
        }
        ArrayList<List<String>> fileLists = new ArrayList<List<String>>(map.values());
        return fileLists;
    }

    public String getFileMD5String(File file) throws FileNotFoundException {
        String string;
        FileInputStream inputStream = new FileInputStream(file);
        try {
            string = DigestUtils.md5Hex((InputStream)inputStream);
        }
        catch (Throwable throwable) {
            try {
                try {
                    inputStream.close();
                }
                catch (Throwable throwable2) {
                    throwable.addSuppressed(throwable2);
                }
                throw throwable;
            }
            catch (IOException e) {
                log.error("Get File Md5 Exception", (Throwable)e);
                return null;
            }
        }
        inputStream.close();
        return string;
    }

    public Boolean ifJar() {
        if (CollectionUtils.isNotEmpty((Collection)this.arguments.getNonOptionArgs())) {
            List configArg = this.arguments.getNonOptionArgs().stream().filter(it -> it.contains("spring.config.location")).collect(Collectors.toList());
            log.info("configArg:{}", JSONObject.toJSON(configArg));
            if (configArg != null && configArg.size() > 0) {
                return true;
            }
        }
        return false;
    }
}

