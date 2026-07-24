const SIZE = {
  auth: 'w-full rounded-xl border border-border bg-input px-3.5 py-3 text-[0.95rem] text-heading outline-none placeholder:text-muted/80 transition focus:border-accent focus:ring-1 focus:ring-accent/30',
  form: 'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent',
}

export const LABEL = {
  auth: 'mb-2 block text-[0.8rem] font-medium tracking-wide text-heading/90',
  form: 'mb-1.5 block text-sm font-medium text-heading',
}

export function Label({ size = 'form', htmlFor, className = '', children }) {
  const cls = `${LABEL[size] || LABEL.form} ${className}`.trim()
  if (htmlFor) {
    return (
      <label className={cls} htmlFor={htmlFor}>
        {children}
      </label>
    )
  }
  return <span className={cls}>{children}</span>
}

const FILE =
  'w-full text-sm text-body file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-black'

/**
 * Reusable field: text/email/password/file, select, or static (read-only) value.
 */
export default function Input({
  label,
  id,
  size = 'form',
  as = 'input',
  type = 'text',
  options,
  children,
  className = '',
  labelClassName = '',
  ...props
}) {
  const fieldId = id || props.name
  const labelCls = `${LABEL[size] || LABEL.form} ${labelClassName}`.trim()
  const fieldCls = `${SIZE[size] || SIZE.form} ${className}`.trim()

  let control
  if (as === 'select') {
    control = (
      <select id={fieldId} className={fieldCls} {...props}>
        {children ||
          options?.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
      </select>
    )
  } else if (as === 'static') {
    control = (
      <p className={`rounded-md border border-border bg-input px-3 py-2.5 text-sm text-body ${className}`.trim()}>
        {children}
      </p>
    )
  } else if (type === 'file') {
    control = <input id={fieldId} type="file" className={`${FILE} ${className}`.trim()} {...props} />
  } else {
    control = <input id={fieldId} type={type} className={fieldCls} {...props} />
  }

  if (!label) return control

  return (
    <div>
      {as === 'static' || !fieldId ? (
        <span className={labelCls}>{label}</span>
      ) : (
        <label className={labelCls} htmlFor={fieldId}>
          {label}
        </label>
      )}
      {control}
    </div>
  )
}
