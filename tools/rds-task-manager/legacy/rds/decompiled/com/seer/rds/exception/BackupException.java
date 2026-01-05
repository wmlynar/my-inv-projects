/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.BackupException
 */
package com.seer.rds.exception;

public class BackupException
extends Exception {
    public BackupException(String message, ReflectiveOperationException ex) {
        super(message);
    }
}

