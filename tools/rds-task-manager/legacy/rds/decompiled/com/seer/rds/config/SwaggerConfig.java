/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.SwaggerConfig
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
 *  org.springframework.web.servlet.config.annotation.ViewControllerRegistry
 *  org.springframework.web.servlet.config.annotation.WebMvcConfigurer
 *  springfox.documentation.builders.ApiInfoBuilder
 *  springfox.documentation.builders.PathSelectors
 *  springfox.documentation.builders.RequestHandlerSelectors
 *  springfox.documentation.spi.DocumentationType
 *  springfox.documentation.spring.web.plugins.Docket
 *  springfox.documentation.swagger2.annotations.EnableSwagger2
 */
package com.seer.rds.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

@Configuration
@EnableSwagger2
public class SwaggerConfig
implements WebMvcConfigurer {
    @Value(value="${swagger.enable}")
    private boolean enableSwagger;
    private String swaggerPrefix = "swagger";

    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.SWAGGER_2).enable(this.enableSwagger).pathMapping("/").select().apis(RequestHandlerSelectors.basePackage((String)"com.seer.rds.web")).paths(PathSelectors.any()).build().apiInfo(new ApiInfoBuilder().title("RDS\u6587\u6863").description("RDS\u6587\u6863").version("9.0").license("RDS").licenseUrl("http://localhost:8080/doc").build());
    }

    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (this.isPrefixSet()) {
            registry.addResourceHandler(new String[]{this.swaggerPrefix + "/swagger-ui.html*"}).addResourceLocations(new String[]{"classpath:/META-INF/resources/"});
            registry.addResourceHandler(new String[]{this.swaggerPrefix + "/webjars/**"}).addResourceLocations(new String[]{"classpath:/META-INF/resources/webjars/"});
        }
    }

    public void addViewControllers(ViewControllerRegistry registry) {
        if (this.isPrefixSet()) {
            registry.addRedirectViewController(this.swaggerPrefix + "/v2/api-docs", "/v2/api-docs").setKeepQueryParams(true);
            registry.addRedirectViewController(this.swaggerPrefix + "/swagger-resources", "/swagger-resources");
            registry.addRedirectViewController(this.swaggerPrefix + "/swagger-resources/configuration/ui", "/swagger-resources/configuration/ui");
            registry.addRedirectViewController(this.swaggerPrefix + "/swagger-resources/configuration/security", "/swagger-resources/configuration/security");
            registry.addRedirectViewController("/swagger-ui.html", "/404");
        }
    }

    private boolean isPrefixSet() {
        return this.swaggerPrefix != null && !"".equals(this.swaggerPrefix) && !"/".equals(this.swaggerPrefix);
    }
}

