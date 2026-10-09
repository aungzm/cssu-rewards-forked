package com.cssurewards.common;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@ConditionalOnProperty(name = "app.serve-frontend", havingValue = "true")
public class FrontendConfiguration implements WebMvcConfigurer {
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // Only API controllers move. Static assets and React routes stay at /.
        configurer.addPathPrefix("/api", HandlerTypePredicate.forAnnotation(RestController.class));
    }
}
