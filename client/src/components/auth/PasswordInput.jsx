import { useState } from 'react'

export default function PasswordInput({
  id,
  autoComplete,
  placeholder,
  value,
  onChange,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="input pr-16"
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
