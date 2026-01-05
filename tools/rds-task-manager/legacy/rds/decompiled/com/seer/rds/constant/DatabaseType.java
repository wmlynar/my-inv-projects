/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.DatabaseType
 */
package com.seer.rds.constant;

public enum DatabaseType {
    MYSQL("com.seer.rds.service.Archiving.database.MySQLBackupService"),
    SQLSERVER("com.seer.rds.service.Archiving.database.SqlServerBackupService");

    private String implementationClassName;

    private DatabaseType(String implementationClassName) {
        this.implementationClassName = implementationClassName;
    }

    public String getImplementationClassName() {
        return this.implementationClassName;
    }

    private DatabaseType() {
    }
}

