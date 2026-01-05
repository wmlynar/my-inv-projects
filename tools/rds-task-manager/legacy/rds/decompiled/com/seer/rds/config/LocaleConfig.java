/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.LocaleConfig
 *  javax.servlet.http.HttpServletRequest
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.web.servlet.LocaleResolver
 *  org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver
 */
package com.seer.rds.config;

import java.util.Locale;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

@Configuration
public class LocaleConfig
extends AcceptHeaderLocaleResolver {
    @Bean
    public LocaleResolver localeResolver() {
        return new LocaleConfig();
    }

    public Locale resolveLocale(HttpServletRequest request) {
        String headerLang = request.getHeader("language");
        return this.transformationLanguage(headerLang);
    }

    public Locale transformationLanguage(String language) {
        if (StringUtils.isEmpty((CharSequence)language)) {
            language = "zh";
        }
        Locale acceptLanguage = null;
        if (language.equals("zh")) {
            acceptLanguage = Locale.SIMPLIFIED_CHINESE;
        } else if (language.equals("en")) {
            acceptLanguage = Locale.US;
        } else {
            String[] langs = language.split("-");
            Locale locale = null;
            if (langs.length > 1) {
                String country = langs[1];
                locale = new Locale(langs[0], country);
            } else {
                locale = new Locale(langs[0]);
            }
            locale.toLanguageTag();
            acceptLanguage = locale;
        }
        return acceptLanguage;
    }
}

