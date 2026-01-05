/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.Archiving.database.DatabaseBackupService
 */
package com.seer.rds.service.Archiving.database;

import java.io.IOException;

public interface DatabaseBackupService {
    public void backupDatabase() throws IOException;

    public void recoveryDatabase();
}

