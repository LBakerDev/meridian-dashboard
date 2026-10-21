import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Portfolio data changes only when the investor commits; 30s avoids
      // refetching on every tab switch while still picking up changes.
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      // Never auto-retry a commit: a retried POST could create a duplicate commitment.
      retry: false,
    },
  },
})
