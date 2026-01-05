/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.ResponseBodyAnalysis
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.vo.ResultVo
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.core.MethodParameter
 *  org.springframework.http.MediaType
 *  org.springframework.http.server.ServerHttpRequest
 *  org.springframework.http.server.ServerHttpResponse
 *  org.springframework.web.bind.annotation.ControllerAdvice
 *  org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice
 */
package com.seer.rds.config;

import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.vo.ResultVo;
import java.util.Locale;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@ControllerAdvice
public class ResponseBodyAnalysis
implements ResponseBodyAdvice {
    @Autowired
    LocaleMessageUtil localeMessageUtil;

    public Object beforeBodyWrite(Object body, MethodParameter arg1, MediaType arg2, Class arg3, ServerHttpRequest req, ServerHttpResponse resp) {
        Locale locale = LocaleContextHolder.getLocale();
        if (body instanceof ResultVo) {
            String translateMsg;
            ResultVo resultVo = (ResultVo)body;
            String msgByLanguage = CommonCodeEnum.getMsgByCode((Integer)resultVo.getCode());
            if (StringUtils.isNotEmpty((CharSequence)msgByLanguage) && !msgByLanguage.equals(translateMsg = this.localeMessageUtil.getMessage(msgByLanguage, locale))) {
                String replacedMsg = resultVo.getMsg().replace(CommonCodeEnum.getMsgByCode((Integer)resultVo.getCode()), translateMsg);
                resultVo.setMsg(replacedMsg);
            }
            return resultVo;
        }
        return body;
    }

    public boolean supports(MethodParameter arg0, Class arg1) {
        return true;
    }
}

