/**
 * The QueryClient.
 *
 * ⚠ Retry is off for 4xx. A 400 from this API means our own query was wrong
 * (an undeclared param, a matchweek out of range) and retrying it three times
 * just makes the same mistake three times — while a 429 on the push routes is a
 * rate limit that a retry actively worsens.
 */
import { QueryClient } from '@tanstack/react-query';

import { CronogolApiError } from '@/lib/cronogol/client';
import { GC_TIME } from './stale';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: GC_TIME,
      retry: (failureCount, error) => {
        if (error instanceof CronogolApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
