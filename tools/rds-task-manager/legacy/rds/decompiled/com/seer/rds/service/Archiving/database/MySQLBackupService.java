/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.service.Archiving.database.DatabaseBackupService
 *  com.seer.rds.service.Archiving.database.MySQLBackupService
 *  org.springframework.beans.factory.annotation.Autowired
 */
package com.seer.rds.service.Archiving.database;

import com.seer.rds.config.PropConfig;
import com.seer.rds.service.Archiving.database.DatabaseBackupService;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;

public class MySQLBackupService
implements DatabaseBackupService {
    @Autowired
    private PropConfig propConfig;
    public static final MySQLBackupService INSTANCE = new MySQLBackupService();

    public static MySQLBackupService getInstance() {
        return INSTANCE;
    }

    public void backupDatabase() throws IOException {
    }

    public void recoveryDatabase() {
    }
}

