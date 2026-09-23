package com.taskflow.util;

/** Pagination metadata — identical shape to the original Express responses. */
public record Pagination(int page, int limit, long total, long totalPages) {

    public static Pagination of(int page, int limit, long total) {
        long totalPages = limit > 0 ? (long) Math.ceil((double) total / limit) : 0;
        return new Pagination(page, limit, total, totalPages);
    }
}
