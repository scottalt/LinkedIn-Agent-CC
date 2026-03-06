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
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs'
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'

  return (
    <div className="flex bg-zinc-100 rounded-lg p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 ${padding} ${textSize} font-medium rounded-md transition-all duration-150 ${
            value === opt.value
              ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/60'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
