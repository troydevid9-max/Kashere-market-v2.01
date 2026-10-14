import { Check } from 'lucide-react'

export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((s, i) => {
        const state = i < current ? 'is-done' : i === current ? 'is-on' : ''
        return (
          <li key={s} className={`stepper__item ${state}`} aria-current={i === current ? 'step' : undefined}>
            <span className="stepper__dot">{i < current ? <Check size={16} strokeWidth={3} /> : i + 1}</span>
            {s}
          </li>
        )
      })}
    </ol>
  )
}
