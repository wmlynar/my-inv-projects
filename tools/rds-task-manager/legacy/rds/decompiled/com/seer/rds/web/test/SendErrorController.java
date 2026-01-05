/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.web.test.SendErrorController
 *  io.swagger.annotations.Api
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.ApplicationEventPublisher
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RestController
 */
package com.seer.rds.web.test;

import io.swagger.annotations.Api;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value={"api"})
@Api(tags={"\u5929\u98ce\u4efb\u52a1\u6a21\u677f\u7ba1\u7406"})
public class SendErrorController {
    private static final Logger log = LoggerFactory.getLogger(SendErrorController.class);
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;
}

