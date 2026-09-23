package com.taskflow.util;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;

/**
 * Serializes the relational {@code id} property as {@code _id} so that responses
 * stay byte-compatible with the original MongoDB/Mongoose JSON contract that the
 * existing frontend depends on (it reads {@code _id} everywhere).
 */
public class MongoIdNamingStrategy extends PropertyNamingStrategies.NamingBase {

    @Override
    public String translate(String propertyName) {
        return "id".equals(propertyName) ? "_id" : propertyName;
    }
}
