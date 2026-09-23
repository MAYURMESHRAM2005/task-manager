package com.taskflow.util;

/** Reproduces the original pagination defaults: page >= 1, 1 <= limit <= 100, default limit 10. */
public final class PaginationUtils {

    private PaginationUtils() {
    }

    public record PageRequest(int page, int limit) {
    }

    public static PageRequest resolve(Integer page, Integer limit) {
        int resolvedPage = page == null ? 1 : Math.max(1, page);
        int resolvedLimit = limit == null ? 10 : Math.min(Math.max(1, limit), 100);
        return new PageRequest(resolvedPage, resolvedLimit);
    }
}
