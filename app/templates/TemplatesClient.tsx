'use client'

import { useState } from 'react'
import type { Template, ModeAffinity, HookType, CloserType } from '@/lib/db/types'
import { SegmentedControl } from '@/components/SegmentedControl'

function ModeAffinityBadge({ mode }: { mode: string | null }) {
  const map: Record<string, string> = {
    engagement: 'bg-blue-500/10 text-blue-400',
    authority: 'bg-emerald-500/10 text-emerald-400',
    both: 'bg-well text-ink-3',
  }
  if (!mode) return null
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[mode] ?? 'bg-well text-ink-3'}`}>
      {mode}
    </span>
  )
}

function TemplateCard({
  template,
  onDelete,
}: {
  template: Template
  onDelete: (id: string) => void
}) {
  const structure: { type: string; label: string }[] = JSON.parse(template.structure)

  return (
    <div className="bg-layer border border-rim rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{template.name}</h3>
          {template.is_seed === 1 && (
            <span className="text-xs text-ink-3">Built-in</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ModeAffinityBadge mode={template.mode_affinity} />
          {template.is_seed === 0 && (
            <button
              onClick={() => onDelete(template.id)}
              className="text-xs text-ink-3 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {structure.map((block, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-ink-3">
            <span className="w-5 h-5 rounded bg-well flex items-center justify-center text-ink-3 shrink-0 border border-rim">
              {i + 1}
            </span>
            <span className="font-medium text-ink-3 uppercase text-[10px] w-12">{block.type}</span>
            <span className="text-ink-2">{block.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-ink-3 pt-2 border-t border-rim">
        {template.hook_type && <span>Hook: {template.hook_type}</span>}
        {template.closer_type && <span>Closer: {template.closer_type.replace('_', ' ')}</span>}
        <span className="ml-auto">Used {template.use_count}x</span>
        {template.avg_engagement_score > 0 && (
          <span>E: {template.avg_engagement_score}</span>
        )}
      </div>
    </div>
  )
}

function NewTemplateForm({ onCreated }: { onCreated: (t: Template) => void }) {
  const [name, setName] = useState('')
  const [hookType, setHookType] = useState<HookType | ''>('')
  const [closerType, setCloserType] = useState<CloserType>('none')
  const [modeAffinity, setModeAffinity] = useState<ModeAffinity>('engagement')
  const [blocks, setBlocks] = useState([{ type: 'hook', label: '' }, { type: 'body', label: '' }, { type: 'closer', label: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addBlock = () => setBlocks((prev) => [...prev, { type: 'body', label: '' }])
  const removeBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i))
  const updateBlock = (i: number, field: 'type' | 'label', value: string) => {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)))
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          hook_type: hookType || undefined,
          structure: blocks.filter((b) => b.label.trim()),
          closer_type: closerType,
          mode_affinity: modeAffinity,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data.template)
      setName('')
      setBlocks([{ type: 'hook', label: '' }, { type: 'body', label: '' }, { type: 'closer', label: '' }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const selectCls = 'w-full text-sm bg-well border border-groove rounded p-2 text-ink focus:outline-none focus:border-gold'
  const inputCls = 'w-full text-sm bg-well border border-groove rounded p-2 text-ink focus:outline-none focus:border-gold'

  return (
    <div className="bg-layer border border-rim rounded-lg p-5 space-y-4">
      <h3 className="text-xs font-medium text-ink-2 uppercase tracking-wider">New Template</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Lesson Learned"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Mode</label>
          <select
            value={modeAffinity}
            onChange={(e) => setModeAffinity(e.target.value as ModeAffinity)}
            className={selectCls}
          >
            <option value="engagement">Engagement</option>
            <option value="authority">Authority</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Hook Type</label>
          <select
            value={hookType}
            onChange={(e) => setHookType(e.target.value as HookType | '')}
            className={selectCls}
          >
            <option value="">None</option>
            <option value="question">Question</option>
            <option value="stat">Stat</option>
            <option value="story">Story</option>
            <option value="contrarian">Contrarian</option>
            <option value="list">List</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Closer Type</label>
          <select
            value={closerType}
            onChange={(e) => setCloserType(e.target.value as CloserType)}
            className={selectCls}
          >
            <option value="none">None</option>
            <option value="question">Question</option>
            <option value="soft_cta">Soft CTA</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink-3 mb-2">Blocks</label>
        <div className="space-y-2">
          {blocks.map((block, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={block.type}
                onChange={(e) => updateBlock(i, 'type', e.target.value)}
                className="text-xs bg-well border border-groove rounded p-1.5 w-24 text-ink focus:outline-none focus:border-gold"
              >
                <option value="hook">hook</option>
                <option value="body">body</option>
                <option value="list">list</option>
                <option value="closer">closer</option>
              </select>
              <input
                type="text"
                value={block.label}
                onChange={(e) => updateBlock(i, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1 text-sm bg-well border border-groove rounded p-1.5 text-ink focus:outline-none focus:border-gold placeholder:text-ink-3"
              />
              <button onClick={() => removeBlock(i)} className="text-xs text-ink-3 hover:text-red-400 px-1 transition-colors">
                x
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addBlock}
          className="mt-2 text-xs text-ink-3 hover:text-ink-2 border border-rim hover:border-groove rounded px-2 py-1 transition-colors"
        >
          + Add block
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-gold text-[#0c0c0c] text-sm font-medium rounded hover:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Create Template'}
        </button>
      </div>
    </div>
  )
}

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState<'all' | 'engagement' | 'authority'>('all')

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const handleCreated = (t: Template) => {
    setTemplates((prev) => [t, ...prev])
    setShowNew(false)
  }

  const filtered = templates.filter((t) => {
    if (filter === 'all') return true
    return t.mode_affinity === filter || t.mode_affinity === 'both'
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SegmentedControl<'all' | 'engagement' | 'authority'>
          options={[
            { value: 'all', label: 'All' },
            { value: 'engagement', label: 'Engagement' },
            { value: 'authority', label: 'Authority' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-3 py-1.5 text-xs bg-gold text-[#0c0c0c] font-medium rounded hover:bg-gold-dim transition-colors"
        >
          {showNew ? 'Cancel' : 'New Template'}
        </button>
      </div>

      {showNew && <NewTemplateForm onCreated={handleCreated} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((t) => (
          <TemplateCard key={t.id} template={t} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}
