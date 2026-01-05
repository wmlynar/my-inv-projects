/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.Filter.AuthFilter
 *  com.seer.rds.config.ShiroAuthRealm
 *  com.seer.rds.config.ShiroConfig
 *  org.apache.shiro.mgt.SecurityManager
 *  org.apache.shiro.realm.Realm
 *  org.apache.shiro.spring.LifecycleBeanPostProcessor
 *  org.apache.shiro.spring.security.interceptor.AuthorizationAttributeSourceAdvisor
 *  org.apache.shiro.spring.web.ShiroFilterFactoryBean
 *  org.apache.shiro.web.mgt.DefaultWebSecurityManager
 *  org.springframework.aop.framework.autoproxy.DefaultAdvisorAutoProxyCreator
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import com.seer.rds.Filter.AuthFilter;
import com.seer.rds.config.ShiroAuthRealm;
import java.util.HashMap;
import java.util.LinkedHashMap;
import org.apache.shiro.mgt.SecurityManager;
import org.apache.shiro.realm.Realm;
import org.apache.shiro.spring.LifecycleBeanPostProcessor;
import org.apache.shiro.spring.security.interceptor.AuthorizationAttributeSourceAdvisor;
import org.apache.shiro.spring.web.ShiroFilterFactoryBean;
import org.apache.shiro.web.mgt.DefaultWebSecurityManager;
import org.springframework.aop.framework.autoproxy.DefaultAdvisorAutoProxyCreator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ShiroConfig {
    @Bean
    public ShiroFilterFactoryBean shiroFilterFactoryBean(DefaultWebSecurityManager defaultWebSecurityManager) {
        ShiroFilterFactoryBean shiroFilterFactoryBean = new ShiroFilterFactoryBean();
        shiroFilterFactoryBean.setSecurityManager((SecurityManager)defaultWebSecurityManager);
        HashMap<String, AuthFilter> filters = new HashMap<String, AuthFilter>();
        filters.put("auth", new AuthFilter());
        shiroFilterFactoryBean.setFilters(filters);
        LinkedHashMap<String, String> filterMap = new LinkedHashMap<String, String>();
        filterMap.put("/oauth", "anon");
        filterMap.put("/ping", "anon");
        filterMap.put("/findAllTemplateTask", "anon");
        filterMap.put("/encrypt", "anon");
        filterMap.put("/getTittleConfig", "anon");
        filterMap.put("/customIcon", "anon");
        filterMap.put("/getExtUiByFileName", "anon");
        filterMap.put("/customBackgroundImg", "anon");
        filterMap.put("/customFavIcon", "anon");
        filterMap.put("/login", "anon");
        filterMap.put("/logout", "anon");
        filterMap.put("/#/view", "anon");
        filterMap.put("/**", "auth");
        shiroFilterFactoryBean.setFilterChainDefinitionMap(filterMap);
        return shiroFilterFactoryBean;
    }

    @Bean
    public DefaultWebSecurityManager defaultWebSecurityManager(ShiroAuthRealm shiroAuthRealm) {
        DefaultWebSecurityManager defaultWebSecurityManager = new DefaultWebSecurityManager();
        defaultWebSecurityManager.setRealm((Realm)shiroAuthRealm);
        return defaultWebSecurityManager;
    }

    @Bean
    public ShiroAuthRealm authRealm() {
        return new ShiroAuthRealm();
    }

    @Bean
    public LifecycleBeanPostProcessor lifecycleBeanPostProcessor() {
        return new LifecycleBeanPostProcessor();
    }

    @Bean
    public AuthorizationAttributeSourceAdvisor authorizationAttributeSourceAdvisor(DefaultWebSecurityManager defaultWebSecurityManager) {
        AuthorizationAttributeSourceAdvisor advisor = new AuthorizationAttributeSourceAdvisor();
        advisor.setSecurityManager((SecurityManager)defaultWebSecurityManager);
        return advisor;
    }

    @Bean
    public static DefaultAdvisorAutoProxyCreator getDefaultAdvisorAutoProxyCreator() {
        DefaultAdvisorAutoProxyCreator creator = new DefaultAdvisorAutoProxyCreator();
        creator.setUsePrefix(true);
        return creator;
    }
}

