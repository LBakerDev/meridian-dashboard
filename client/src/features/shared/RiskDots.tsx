import type { RiskLevel } from '../../api/types.ts'
import { riskLabel } from '../../domain/goals.ts'
import classes from './RiskDots.module.css'

/** ●●●●○: the portfolio's risk, 1 to 5. Screen readers hear "Higher risk, 4 of 5". */
export function RiskDots({ risk }: { risk: RiskLevel }) {
  const label = `${riskLabel(risk)}, ${risk} of 5`
  return (
    <span className={classes.dots} role="img" aria-label={label} title={`Risk ${risk} of 5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <i key={level} data-on={level <= risk || undefined} />
      ))}
    </span>
  )
}
