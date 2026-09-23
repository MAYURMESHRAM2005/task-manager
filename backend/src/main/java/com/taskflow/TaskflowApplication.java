package com.taskflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * TaskFlow Spring Boot application entry point.
 *
 * React/HTML frontend -> Spring Boot REST API -> Spring Data JPA/Hibernate -> MySQL
 *
 * UserDetailsServiceAutoConfiguration is excluded because authentication is handled
 * entirely by the JWT filter (see security/JwtAuthenticationFilter). Without the
 * exclusion, Spring Boot would create a stray in-memory user and print a generated
 * password that the application never uses.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
public class TaskflowApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskflowApplication.class, args);
    }
}
