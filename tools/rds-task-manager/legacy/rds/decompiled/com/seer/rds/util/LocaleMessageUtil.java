/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.LocaleMessageUtil
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.MessageSource
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.util;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

@Component
public class LocaleMessageUtil {
    @Autowired
    private MessageSource messageSource;

    public String getMessage(String code) {
        return this.getMessage(code, new Object[0]);
    }

    public String getMessage(String code, String defaultMessage) {
        return this.getMessage(code, null, defaultMessage);
    }

    public String getMessage(String code, String defaultMessage, Locale locale) {
        return this.getMessage(code, null, defaultMessage, locale);
    }

    public String getMessage(String code, Locale locale) {
        return this.getMessage(code, null, "", locale);
    }

    public String getMessage(String code, Object[] args) {
        return this.getMessage(code, args, "");
    }

    public String getMessage(String code, Object[] args, Locale locale) {
        return this.getMessage(code, args, "", locale);
    }

    public String getMessage(String code, Object[] args, String defaultMessage) {
        Locale locale = LocaleContextHolder.getLocale();
        String msg = this.getMessage(code, args, defaultMessage, locale);
        if (StringUtils.isBlank((CharSequence)msg)) {
            msg = code;
        }
        return msg;
    }

    public String getMessage(String code, Object[] args, String defaultMessage, Locale locale) {
        String message = this.messageSource.getMessage(code, args, defaultMessage, locale);
        if (StringUtils.isBlank((CharSequence)message)) {
            return code;
        }
        return message;
    }

    public String getMessageMatch(String str, Locale locale) {
        String regex = "@\\{([\\w\\d\\.]+)}";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(str);
        while (matcher.find()) {
            String group = matcher.group();
            str = str.replace(group, this.getMessage(group.substring(2, group.length() - 1), locale));
        }
        return str;
    }
}

