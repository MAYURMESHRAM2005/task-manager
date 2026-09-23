package com.taskflow.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

/**
 * Lenient parser for incoming date strings. The frontend sends plain dates
 * ({@code yyyy-MM-dd}) for due dates and {@code yyyy-MM-ddTHH:mm} for reminders,
 * while the calendar sends full ISO instants ({@code ...Z}).
 */
public final class DateParser {

    private DateParser() {
    }

    public static LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        try {
            return LocalDateTime.parse(v);
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return OffsetDateTime.parse(v).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return Instant.parse(v).atZone(ZoneOffset.UTC).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDate.parse(v).atStartOfDay();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        throw new DateTimeParseException("Unparseable date-time", value, 0);
    }

    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        try {
            return LocalDate.parse(v);
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return OffsetDateTime.parse(v).toLocalDate();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return Instant.parse(v).atZone(ZoneOffset.UTC).toLocalDate();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDateTime.parse(v).toLocalDate();
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        throw new DateTimeParseException("Unparseable date", value, 0);
    }
}
