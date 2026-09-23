package com.taskflow.config;

import com.fasterxml.jackson.databind.module.SimpleModule;
import com.taskflow.util.LenientDateDeserializers;
import com.taskflow.util.MongoIdNamingStrategy;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer taskflowJacksonCustomizer() {
        return builder -> {
            // Keep the MongoDB-style "_id" field name the frontend expects.
            builder.propertyNamingStrategy(new MongoIdNamingStrategy());

            // Accept date-only and ISO-instant date strings for date fields.
            SimpleModule module = new SimpleModule();
            module.addDeserializer(LocalDate.class, new LenientDateDeserializers.LocalDateDeserializer());
            module.addDeserializer(LocalDateTime.class, new LenientDateDeserializers.LocalDateTimeDeserializer());
            builder.modulesToInstall(module);
        };
    }
}
