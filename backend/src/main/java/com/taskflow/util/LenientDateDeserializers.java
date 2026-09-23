package com.taskflow.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Jackson deserializers that tolerate both plain dates and full ISO instants. */
public final class LenientDateDeserializers {

    private LenientDateDeserializers() {
    }

    public static class LocalDateDeserializer extends JsonDeserializer<LocalDate> {
        @Override
        public LocalDate deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            String value = parser.getValueAsString();
            if (value == null || value.isBlank()) {
                return null;
            }
            return DateParser.parseDate(value);
        }
    }

    public static class LocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {
        @Override
        public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            String value = parser.getValueAsString();
            if (value == null || value.isBlank()) {
                return null;
            }
            return DateParser.parseDateTime(value);
        }
    }
}
