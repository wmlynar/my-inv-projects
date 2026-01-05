/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.DatabaseType
 *  com.seer.rds.exception.BackupException
 *  com.seer.rds.service.Archiving.database.DatabaseBackupService
 *  com.seer.rds.service.Archiving.database.DatabaseBackupServiceFactory
 */
package com.seer.rds.service.Archiving.database;

import com.seer.rds.constant.DatabaseType;
import com.seer.rds.exception.BackupException;
import com.seer.rds.service.Archiving.database.DatabaseBackupService;
import java.lang.reflect.InvocationTargetException;

public class DatabaseBackupServiceFactory {
    public static DatabaseBackupService getBackupService(DatabaseType databaseType) throws BackupException {
        try {
            Class<?> implementationClassName = Class.forName(databaseType.getImplementationClassName());
            return (DatabaseBackupService)implementationClassName.getDeclaredConstructor(new Class[0]).newInstance(new Object[0]);
        }
        catch (ClassNotFoundException | IllegalAccessException | InstantiationException | NoSuchMethodException | InvocationTargetException ex) {
            throw new BackupException("Unable to create backup service for database type: " + databaseType, ex);
        }
    }
}

