/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.Archiving.database.DatabaseBackupService
 *  com.seer.rds.service.Archiving.database.SqlServerBackupService
 */
package com.seer.rds.service.Archiving.database;

import com.seer.rds.service.Archiving.database.DatabaseBackupService;

public class SqlServerBackupService
implements DatabaseBackupService {
    private static SqlServerBackupService instance = new SqlServerBackupService();

    private SqlServerBackupService() {
    }

    public static SqlServerBackupService getInstance() {
        return instance;
    }

    public void backupDatabase() {
    }

    public void recoveryDatabase() {
    }
}

