import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

import App from './App.tsx'
import { cssVariablesResolver, theme } from './theme/theme.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Light only for now: the dark palette isn't designed, so don't follow the OS setting. */}
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} forceColorScheme="light">
      <Notifications position="bottom-right" />
      <App />
    </MantineProvider>
  </StrictMode>,
)
