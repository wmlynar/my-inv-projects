/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.MailConfigOfView
 *  com.seer.rds.email.EmailUtil
 *  com.seer.rds.web.config.ConfigFileController
 *  org.springframework.boot.CommandLineRunner
 *  org.springframework.mail.javamail.JavaMailSender
 *  org.springframework.mail.javamail.JavaMailSenderImpl
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.email;

import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.MailConfigOfView;
import com.seer.rds.web.config.ConfigFileController;
import java.util.Properties;
import org.springframework.boot.CommandLineRunner;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

@Component
public class EmailUtil
implements CommandLineRunner {
    public static JavaMailSender javaMailSender;

    public void run(String ... args) throws Exception {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (null == commonConfig) {
            return;
        }
        MailConfigOfView mailConfigOfView = commonConfig.getEmailConfig();
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(mailConfigOfView.getHost());
        sender.setPort(mailConfigOfView.getPort().intValue());
        sender.setUsername(mailConfigOfView.getUsername());
        sender.setPassword(mailConfigOfView.getPassword());
        sender.setDefaultEncoding(mailConfigOfView.getEncoding());
        sender.setProtocol(mailConfigOfView.getProtocol());
        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", mailConfigOfView.getAuth());
        props.put("mail.smtp.timeout", mailConfigOfView.getTimeout());
        props.put("mail.smtp.connectiontimeout", mailConfigOfView.getConnTimeout());
        props.put("mail.smtp.ssl.enable", mailConfigOfView.getSslEnable());
        props.put("mail.debug", mailConfigOfView.getDebug());
        javaMailSender = sender;
    }
}

