import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data only changes when you create, edit or add to a goal (and those
      // writes refresh what they change), so 30s avoids refetching on every
      // tab switch while still picking up changes.
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      // Never auto-retry a write: a retried deposit could add money twice.
      retry: false,
    },
  },
})
