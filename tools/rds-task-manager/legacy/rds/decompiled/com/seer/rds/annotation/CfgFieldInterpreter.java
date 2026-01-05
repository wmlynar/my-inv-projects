/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.CfgFieldInterpreter
 */
package com.seer.rds.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(value={ElementType.FIELD})
@Retention(value=RetentionPolicy.RUNTIME)
public @interface CfgFieldInterpreter {
    public String name();

    public String remark();

    public int min() default -2147483648;

    public int max() default 0x7FFFFFFF;
}

