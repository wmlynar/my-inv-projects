/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.RequestInterceptor
 *  com.seer.rds.config.SecurityConfig
 *  com.seer.rds.config.WebConfig
 *  com.seer.rds.service.admin.LoginService
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.http.MediaType
 *  org.springframework.web.servlet.HandlerInterceptor
 *  org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer
 *  org.springframework.web.servlet.config.annotation.CorsRegistry
 *  org.springframework.web.servlet.config.annotation.InterceptorRegistration
 *  org.springframework.web.servlet.config.annotation.InterceptorRegistry
 *  org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
 *  org.springframework.web.servlet.config.annotation.ViewControllerRegistry
 *  org.springframework.web.servlet.config.annotation.WebMvcConfigurer
 */
package com.seer.rds.config;

import com.seer.rds.config.PropConfig;
import com.seer.rds.config.RequestInterceptor;
import com.seer.rds.config.SecurityConfig;
import com.seer.rds.service.admin.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig
implements WebMvcConfigurer {
    @Value(value="${rds.enableCors: false}")
    private Boolean enableCors;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private LoginService loginService;
    @Autowired
    private SecurityConfig securityConfig;

    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/pda/").setViewName("forward:/pda/index.html");
        registry.addViewController("/screen/").setViewName("forward:/screen/index.html");
        registry.setOrder(Integer.MIN_VALUE);
        super.addViewControllers(registry);
    }

    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer.favorPathExtension(false);
        configurer.defaultContentType(new MediaType[]{MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML});
        configurer.mediaType("scene", MediaType.APPLICATION_JSON);
        configurer.mediaType("smap", MediaType.APPLICATION_JSON);
        configurer.mediaType("json", MediaType.APPLICATION_JSON);
        configurer.mediaType("xml", MediaType.APPLICATION_XML);
        configurer.mediaType("png", MediaType.IMAGE_PNG);
        configurer.mediaType("jpeg", MediaType.IMAGE_JPEG);
        configurer.mediaType("gif", MediaType.IMAGE_GIF);
        configurer.mediaType("js", MediaType.parseMediaType((String)"application/javascript"));
    }

    public void addInterceptors(InterceptorRegistry registry) {
        InterceptorRegistration registration = registry.addInterceptor((HandlerInterceptor)new RequestInterceptor(this.loginService));
        registration.addPathPatterns(new String[]{"/**"});
        if (this.securityConfig.getDisablePublicInterface() != null && this.securityConfig.getDisablePublicInterface().booleanValue()) {
            registration.excludePathPatterns(new String[]{"/", "/assert/**", "/index.html", "/global/get", "/fview/**", "/admin/oauth", "/admin/login", "/admin/logo", "/admin/getExtUi", "/admin/ping", "/admin/logout", "/admin/uploadBackgroundImg", "/admin/uploadLogo", "/admin/uploadFavIcon", "/admin/version", "/api/display-scene", "/api/icon/*", "/api/background/*", "/api/work-sites/sitesPageAble", "/api/work-sites/sites", "/api/work-sites/monitorSites", "/script-api/**", "/api/stat/**", "/api/operator/getUnFinishedDemandList", "/system/getLanguagePack", "/system/translateSourceFile", "/pda/**", "/index.html**", "/forbidden.html**", "/oath/authorize", "/swagger/swagger-ui.html", "/easyOrder/cachePrint", "/api/userConfig/**", "/handle/register/**", "/admin/encrypt", "/general/startSingleForkScene", "/api/controlMotion", "/test/**", "/webpage/**", "/monitor/**"});
            return;
        }
        registration.excludePathPatterns(new String[]{"/", "/assert/**", "/index.html", "/global/get", "/fview/**", "/admin/oauth", "/admin/login", "/admin/logo", "/admin/getExtUi", "/admin/ping", "/admin/logout", "/admin/uploadBackgroundImg", "/admin/uploadLogo", "/admin/uploadFavIcon", "/admin/version", "/api/agv-report/core", "/api/set-order", "/api/display-scene", "/api/icon/*", "/api/background/*", "/api/getExtUiByFileName/*", "/api/work-sites/sitesPageAble", "/api/work-sites/sites", "/api/work-sites/monitorSites", "/api/queryWindTask", "/api/singleFork/**", "/api/queryBlocksByTaskId", "/api/releaseWaitPassBlock", "/api/work-sites/getAllExtFields", "/api/stop-task", "/api/work-sites/updateFilledStatus", "/script-api/**", "/api/stat/**", "/api/operator/getUnFinishedDemandList", "/system/getLanguagePack", "/system/translateSourceFile", "/pda/**", "/index.html**", "/forbidden.html**", "/oath/authorize", "/swagger/swagger-ui.html", "/screen/**", "/seer/**", "/easyOrder/cachePrint", "/api/work-sites/holdWorksiteByCore", "/api/work-sites/releaseWorksiteHolder", "/chargers/updateChargeModels", "/chargers/queryChargers", "/api/userConfig/**", "/handle/register/**", "/admin/encrypt", "/api/work-sites/worksiteFilled", "/api/work-sites/worksiteUnFilled", "/api/work-sites/lockedSites", "/api/work-sites/unLockedSites", "/general/startSingleForkScene", "/api/controlled-agv/**", "/test/siteStatus", "/api/stopFork", "/api/setForkHeight", "/api/controlMotion", "/api/siteGroupDemand/add", "/api/siteGroupDemand/get", "/api/siteGroupDemand/stop", "/api/siteGroupDemand/stopAll", "/api/siteGroupDemand/interrupt", "/api/siteGroupDemand/interruptAll", "/api/siteGroupDemand/resume", "/api/siteGroupDemand/resumeAll", "/api/siteGroupDemand/getById", "/api/work-sites/getAllSiteIds", "/api/siteGroupDemand/getNotStopped", "/api/suspend-task/**", "/api/start-task/**", "/api/change_robot", "/test/**", "/webpage/**", "/monitor/**"});
    }

    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(new String[]{"/img/**"}).addResourceLocations(new String[]{"file:" + this.propConfig.getScriptDir() + "img/"});
        registry.addResourceHandler(new String[]{"/ext/**"}).addResourceLocations(new String[]{"file:" + this.propConfig.getRdsStaticDir() + "ext/"});
        registry.addResourceHandler(new String[]{"/seer/**"}).addResourceLocations(new String[]{"file:" + this.propConfig.getSceneDir()});
        registry.addResourceHandler(new String[]{"/bpdoc/**"}).addResourceLocations(new String[]{"classpath:/bpdoc/"});
        registry.addResourceHandler(new String[]{"/fview/**"}).addResourceLocations(new String[]{"classpath:/fview/"});
        registry.addResourceHandler(new String[]{"/**"}).addResourceLocations(new String[]{"file:" + this.propConfig.getRdsStaticDir()});
    }

    public void addCorsMappings(CorsRegistry registry) {
        if (Boolean.TRUE.equals(this.enableCors)) {
            registry.addMapping("/**").allowedOriginPatterns(new String[]{"*"}).allowCredentials(true).allowedMethods(new String[]{"GET", "POST", "PUT", "OPTIONS"}).maxAge(3600L);
        }
    }
}

