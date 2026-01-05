/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.Description
 */
package com.seer.rds.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(value={ElementType.FIELD, ElementType.METHOD})
@Retention(value=RetentionPolicy.RUNTIME)
public @interface Description {
    public String value();
}

