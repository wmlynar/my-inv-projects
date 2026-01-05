/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.runnable.ArchivingApplicationYmlRunnable
 *  com.seer.rds.service.Archiving.ArchivingService
 *  com.seer.rds.util.SpringUtil
 *  org.apache.commons.io.FileUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.core.io.ClassPathResource
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.runnable;

import com.seer.rds.config.PropConfig;
import com.seer.rds.service.Archiving.ArchivingService;
import com.seer.rds.util.SpringUtil;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileAttribute;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class ArchivingApplicationYmlRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(ArchivingApplicationYmlRunnable.class);

    @Override
    public void run() {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        ArchivingService archivingService = (ArchivingService)SpringUtil.getBean(ArchivingService.class);
        Boolean ifJar = archivingService.ifJar();
        Object filename = "";
        if (ifJar.booleanValue()) {
            log.info("jar start");
            filename = propConfig.getAppDir() + "application.yml";
        } else {
            ClassPathResource fileResource = new ClassPathResource("application.yml");
            if (fileResource.exists()) {
                try {
                    filename = new ClassPathResource("application.yml").getURI().getPath();
                }
                catch (IOException e) {
                    log.error("\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u5931\u8d25", (Throwable)e);
                    return;
                }
            }
            log.info("not jar start");
        }
        String filenameHistory = propConfig.getRdsHistoryDir() + "config";
        try {
            this.checkFolderAndDoSomething(filenameHistory, (String)filename, archivingService);
        }
        catch (IOException e) {
            log.error("Archiving error", (Throwable)e);
        }
    }

    private void checkFolderAndDoSomething(String filenameHistory, String filename, ArchivingService archivingService) throws IOException {
        Path folder = Paths.get(filenameHistory, new String[0]);
        Files.createDirectories(folder, new FileAttribute[0]);
        try (Stream<Path> files = Files.list(folder);){
            if (files.findAny().isPresent()) {
                String lastFileName = this.getLastFileName(folder);
                String archivingFileMD5String = archivingService.getFileMD5String(new File(folder.toString(), lastFileName));
                String fileMD5String = archivingService.getFileMD5String(new File(filename));
                if (fileMD5String.equals(archivingFileMD5String)) {
                    log.info("No archiving required for the same MD5");
                } else {
                    this.archivingData(filenameHistory, filename);
                }
            } else {
                this.archivingData(filenameHistory, filename);
            }
        }
    }

    private void archivingData(String filenameHistory, String filename) throws IOException {
        String data = FileUtils.readFileToString((File)new File(filename), (String)"utf-8");
        String newFileName = filenameHistory + "/application-" + Instant.now().toEpochMilli() + ".yml";
        FileUtils.writeStringToFile((File)new File(newFileName), (String)data, (Charset)Charset.forName("UTF-8"));
    }

    private String getLastFileName(Path folder) throws IOException {
        try (Stream<Path> files = Files.list(folder);){
            List fileNames = files.map(Path::getFileName).map(Path::toString).collect(Collectors.toList());
            Collections.sort(fileNames);
            String string = (String)fileNames.get(fileNames.size() - 1);
            return string;
        }
    }
}

