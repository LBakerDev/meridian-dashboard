import { Anchor, Drawer, Stack, Text, Title } from '@mantine/core'
import { useState, type ReactNode } from 'react'

import type { Portfolio } from '../../api/types.ts'
import { formatMoney } from '../../domain/format.ts'
import classes from './drawers.module.css'
import { GoalBasics, type Basics } from './GoalBasics.tsx'
import { NewGoalForm } from './NewGoalForm.tsx'
import { PortfolioPicker } from './PortfolioPicker.tsx'

type Step = 'basics' | 'portfolio' | 'monthly'

/**
 * New goal in three short steps, starting with what you're saving for (not with
 * a list of portfolios): 1. name and target, 2. how it's invested, 3. how much
 * each month. Each step keeps what you entered if you go back.
 */
export function NewGoalDrawer({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('basics')
  const [basics, setBasics] = useState<Basics | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="New goal"
      // Reset once the close animation finishes, so the content doesn't jump while sliding out.
      onExitTransitionEnd={() => {
        setStep('basics')
        setBasics(null)
        setPortfolio(null)
      }}
    >
      {step === 'basics' || !basics ? (
        <StepLayout n={1} title="What are you saving for?" intro="Name it and set a target. Meridian invests a monthly deposit toward it.">
          <GoalBasics
            initial={basics}
            onCancel={onClose}
            onNext={(next) => {
              setBasics(next)
              setStep('portfolio')
            }}
          />
        </StepLayout>
      ) : step === 'portfolio' || !portfolio ? (
        <StepLayout
          n={2}
          title="How should we invest it?"
          intro="Each goal goes into one ready-made portfolio. More dots means more risk: it can grow faster, but it swings more. Not sure? Balanced suits most goals."
          back={{ label: 'Back', onClick: () => setStep('basics') }}
        >
          <PortfolioPicker
            selectedId={portfolio?.id ?? null}
            onSelect={(next) => {
              setPortfolio(next)
              setStep('monthly')
            }}
          />
        </StepLayout>
      ) : (
        <StepLayout
          n={3}
          title="How much each month?"
          intro={`${basics.name}: ${formatMoney(basics.target)} in ${portfolio.name}. You can change or pause it any time.`}
          back={{ label: 'Change portfolio', onClick: () => setStep('portfolio') }}
        >
          {/* Keyed by portfolio, so switching starts a fresh form. */}
          <NewGoalForm
            key={portfolio.id}
            basics={basics}
            portfolio={portfolio}
            onCreated={onClose}
            onChangePortfolio={() => setStep('portfolio')}
            onEditBasics={() => setStep('basics')}
            onCancel={onClose}
          />
        </StepLayout>
      )}
    </Drawer>
  )
}

interface StepLayoutProps {
  n: number
  title: string
  intro: string
  back?: { label: string; onClick: () => void }
  children: ReactNode
}

function StepLayout({ n, title, intro, back, children }: StepLayoutProps) {
  return (
    <Stack gap="md">
      {back && (
        <Anchor component="button" type="button" size="sm" c="dimmed" w="fit-content" onClick={back.onClick}>
          ← {back.label}
        </Anchor>
      )}
      <div>
        <Text component="p" className={classes.stepCount} m={0}>
          Step {n} of 3
        </Text>
        <Title order={3} size="h4" mt={4}>
          {title}
        </Title>
        <Text size="sm" c="dimmed" mt={6}>
          {intro}
        </Text>
      </div>
      {children}
    </Stack>
  )
}
