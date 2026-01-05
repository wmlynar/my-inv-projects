/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.SpringUtil
 *  org.springframework.beans.BeansException
 *  org.springframework.context.ApplicationContext
 *  org.springframework.context.ApplicationContextAware
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.util;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component(value="springUtil")
public class SpringUtil
implements ApplicationContextAware {
    private static ApplicationContext context;

    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        context = applicationContext;
    }

    public static void set(ApplicationContext applicationContext) {
        context = applicationContext;
    }

    public static <T> T getBean(Class<T> beanClass) {
        return (T)context.getBean(beanClass);
    }

    public static <T> T getBean(String beanName) {
        return (T)context.getBean(beanName);
    }

    public static <T> T getBean(String name, Class<T> beanClass) {
        return (T)context.getBean(name, beanClass);
    }
}

