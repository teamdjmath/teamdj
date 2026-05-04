import { type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'

interface FieldProps {
  label?: string
  error?: string
  required?: boolean
}

const inputCls = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all disabled:opacity-50'

export function InputField({
  label,
  error,
  required,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-zinc-600">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <input required={required} className={inputCls} {...props} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

export function SelectField({
  label,
  error,
  required,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-zinc-600">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <select required={required} className={inputCls} {...props}>
        {children}
      </select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

export function TextareaField({
  label,
  error,
  required,
  ...props
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-zinc-600">
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <textarea required={required} className={inputCls + ' resize-none'} {...props} />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
