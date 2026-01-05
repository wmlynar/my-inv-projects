/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.web.system.CustomErrorController
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.catalina.connector.ResponseFacade
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.boot.web.servlet.error.ErrorController
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.system;

import javax.servlet.http.HttpServletResponse;
import org.apache.catalina.connector.ResponseFacade;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"/api"})
class CustomErrorController
implements ErrorController {
    private static final Logger log = LoggerFactory.getLogger(CustomErrorController.class);

    CustomErrorController() {
    }

    @RequestMapping(value={"/systemError"})
    @ResponseBody
    public String handleError(HttpServletResponse request, HttpServletResponse response) {
        log.error("error: " + ((ResponseFacade)response).getStatus());
        return "Request Error";
    }
}

