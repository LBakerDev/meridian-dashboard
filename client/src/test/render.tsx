import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

import { cssVariablesResolver, theme } from '../theme/theme.ts'
import { createQueryWrapper } from './queryWrapper.tsx'

/**
 * Renders a component with the same providers as main.tsx: Mantine theme,
 * a fresh QueryClient, and an in-memory router starting at `route`.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const { queryClient, wrapper: QueryWrapper } = createQueryWrapper()

  function Providers({ children }: { children: ReactNode }) {
    return (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
        <Notifications />
        <QueryWrapper>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </QueryWrapper>
      </MantineProvider>
    )
  }

  return { queryClient, user: userEvent.setup(), ...render(ui, { wrapper: Providers }) }
}
