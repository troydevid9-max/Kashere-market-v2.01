import { useId, useState } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'

export function Field({ label, required, optional, icon: Icon, error, hint, as = 'input', children, className = '', ...props }) {
  const id = useId()
  const Tag = as
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <i>*</i>} {optional && <small>(Optional)</small>}
        </label>
      )}
      <div className={`field__box ${as === 'textarea' ? 'field__box--area' : ''}`}>
        {Icon && <Icon size={19} />}
        <Tag id={id} aria-invalid={!!error} {...props}>{children}</Tag>
        {as === 'select' && <ChevronDown size={18} color="var(--muted)" />}
      </div>
      {error ? <p className="field__msg">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}

/** Auth-style field: icon on the left, bold label above the value. `password` adds a show/hide toggle. */
export function AuthField({ label, icon: Icon, error, password, ...props }) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <div>
      <div className={`afield ${error ? 'afield--error' : ''}`}>
        {Icon && <Icon size={20} />}
        <div className="afield__body">
          <label htmlFor={id}>{label}</label>
          <input id={id} type={password ? (show ? 'text' : 'password') : 'text'} aria-invalid={!!error} {...props} />
        </div>
        {password && (
          <button type="button" className="field__eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        )}
      </div>
      {error && <p className="afield-msg">{error}</p>}
    </div>
  )
}
