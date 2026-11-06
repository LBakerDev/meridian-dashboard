import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

import App from './App.tsx'
import { queryClient } from './lib/queryClient.ts'
import { cssVariablesResolver, theme } from './theme/theme.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Dark by default; the header toggle switches to light and the choice is remembered. */}
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="dark">
      <Notifications position="bottom-right" />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
