/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.runnable.InitSysDataRunnable
 *  com.seer.rds.util.ResourceUtil
 *  org.apache.commons.io.FileUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.boot.CommandLineRunner
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.runnable;

import com.seer.rds.config.PropConfig;
import com.seer.rds.util.ResourceUtil;
import java.io.File;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class InitSysDataRunnable
implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(InitSysDataRunnable.class);
    @Autowired
    private PropConfig propConfig;

    public void run(String ... args) throws Exception {
        File file;
        try {
            file = new File(this.propConfig.getConfigDir() + "block");
            if (file.exists()) {
                FileUtils.cleanDirectory((File)file);
            }
            ResourceUtil.copyResourcesFileToTemp((String)"classpath:/bpdef/", (String)"*", (String)(this.propConfig.getConfigDir() + "block"));
        }
        catch (Exception e) {
            log.error("bp\u5b9a\u4e49\u6587\u4ef6\u62f7\u8d1d\u5931\u8d25", (Throwable)e);
        }
        try {
            file = new File(this.propConfig.getConfigDir() + "biz/SingleForkScene");
            if (file.exists()) {
                FileUtils.cleanDirectory((File)file);
            }
            ResourceUtil.copyResourcesFileToTemp((String)"classpath:/biz/SingleForkScene/", (String)"*", (String)(this.propConfig.getConfigDir() + "biz/SingleForkScene"));
        }
        catch (Exception e) {
            log.error("biz\u5b9a\u4e49\u6587\u4ef6\u62f7\u8d1d\u5931\u8d25", (Throwable)e);
        }
    }
}

