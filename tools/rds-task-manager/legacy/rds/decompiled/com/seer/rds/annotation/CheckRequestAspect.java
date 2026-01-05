/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.CheckRequestAspect
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.exception.BasicAuthFailException
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.servlet.http.HttpServletRequest
 *  org.apache.commons.lang3.StringUtils
 *  org.aspectj.lang.JoinPoint
 *  org.aspectj.lang.annotation.Aspect
 *  org.aspectj.lang.annotation.Before
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 *  org.springframework.web.context.request.RequestAttributes
 *  org.springframework.web.context.request.RequestContextHolder
 *  org.springframework.web.context.request.ServletRequestAttributes
 */
package com.seer.rds.annotation;

import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.exception.BasicAuthFailException;
import com.seer.rds.web.config.ConfigFileController;
import java.util.Base64;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class CheckRequestAspect {
    private static final Logger log = LoggerFactory.getLogger(CheckRequestAspect.class);

    @Before(value="@annotation(com.seer.rds.annotation.CheckRequest)")
    public void doBefore(JoinPoint joinPoint) throws BasicAuthFailException {
        Boolean enableBasicAuth;
        RequestAttributes requestAttributes = RequestContextHolder.currentRequestAttributes();
        HttpServletRequest request = ((ServletRequestAttributes)requestAttributes).getRequest();
        String isInnerRequest = request.getHeader("ServiceAuth");
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && (enableBasicAuth = commonConfig.getBasicAuthConfig().getEnable()).booleanValue() && StringUtils.isEmpty((CharSequence)isInnerRequest)) {
            String authorization = request.getHeader("Authorization");
            String usernameAndPassword = commonConfig.getBasicAuthConfig().getBasicAuthUsername() + ":" + commonConfig.getBasicAuthConfig().getBasicAuthPassword();
            String encodeAuthorization = "Basic " + new String(Base64.getEncoder().encode(usernameAndPassword.getBytes()));
            if (!encodeAuthorization.equals(authorization)) {
                log.info("BasicAuth authentication failed , {}", (Object)request.getRequestURI());
                throw new BasicAuthFailException();
            }
        }
    }
}

