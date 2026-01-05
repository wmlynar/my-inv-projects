/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.annotation.Excel
 *  com.seer.rds.util.ExcelHeaderLangUtils
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  org.apache.commons.lang3.StringUtils
 */
package com.seer.rds.util;

import cn.afterturn.easypoi.excel.annotation.Excel;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;

public class ExcelHeaderLangUtils {
    private static final ConcurrentHashMap<String, String> namePlaceholders = new ConcurrentHashMap();

    private ExcelHeaderLangUtils() {
    }

    public static Class chooseLang(Class<?> pojoClass, Locale locale) throws NoSuchFieldException, IllegalAccessException {
        Field[] fields;
        LocaleMessageUtil localeMessageUtil = (LocaleMessageUtil)SpringUtil.getBean(LocaleMessageUtil.class);
        for (Field field : fields = pojoClass.getDeclaredFields()) {
            Excel anoExcel = field.getAnnotation(Excel.class);
            if (anoExcel == null) continue;
            InvocationHandler invocationHandler = Proxy.getInvocationHandler(anoExcel);
            Field f = invocationHandler.getClass().getDeclaredField("memberValues");
            f.setAccessible(true);
            Map memberValues = (Map)f.get(invocationHandler);
            String excelValue = (String)memberValues.get("name");
            if (excelValue.contains(".")) {
                namePlaceholders.put(pojoClass.getName() + field.getName(), excelValue);
            } else {
                String placeHolder = (String)namePlaceholders.get(pojoClass.getName() + field.getName());
                if (StringUtils.isNotEmpty((CharSequence)placeHolder)) {
                    excelValue = placeHolder;
                }
            }
            memberValues.put("name", localeMessageUtil.getMessage(excelValue, locale));
        }
        return pojoClass;
    }
}

