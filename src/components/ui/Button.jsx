export function Button({ variant = 'primary', size, block, loading, className = '', children, type = 'button', disabled, ...props }) {
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...props}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}
