import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core'

/** Light/dark switch. Dark by default; Mantine remembers the choice in localStorage. */
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const current = useComputedColorScheme('dark')
  const next = current === 'dark' ? 'light' : 'dark'

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      radius="xl"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setColorScheme(next)}
    >
      {current === 'dark' ? <SunIcon /> : <MoonIcon />}
    </ActionIcon>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  )
}
