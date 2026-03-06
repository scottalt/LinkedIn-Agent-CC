interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'

  return (
    <div className="flex bg-well rounded-lg p-0.5 gap-0.5 border border-rim">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 ${padding} text-xs font-medium rounded-md transition-all duration-150 ${
            value === opt.value
              ? 'bg-gold text-[#0c0c0c] shadow-sm'
              : 'text-ink-3 hover:text-ink-2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
