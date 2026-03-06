'use client'

import { useState } from 'react'
import type { StylePack } from '@/lib/db/types'

interface StyleCenterClientProps {
  stylePack: StylePack
}

function TagList({
  items,
  onRemove,
  onAdd,
  placeholder,
}: {
  items: string[]
  onRemove: (i: number) => void
  onAdd: (v: string) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const v = input.trim()
    if (v && !items.includes(v)) {
      onAdd(v)
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-well text-ink-2 text-xs px-2 py-1 rounded border border-rim"
          >
            {item}
            <button
              onClick={() => onRemove(i)}
              className="text-ink-3 hover:text-red-400 ml-0.5 transition-colors"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 text-sm bg-well border border-groove rounded p-2 text-ink focus:outline-none focus:border-gold placeholder:text-ink-3"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 text-xs bg-well border border-groove text-ink-2 hover:text-ink hover:border-gold rounded transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function IngestPanel() {
  const [rawInput, setRawInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [patterns, setPatterns] = useState<Record<string, unknown> | null>(null)
  const [committed, setCommitted] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!rawInput.trim()) return
    setAnalyzing(true)
    setError('')
    setSessionId(null)
    setPatterns(null)
    setCommitted(false)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessionId(data.sessionId)
      setPatterns(data.patterns)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCommit = async () => {
    if (!sessionId) return
    setCommitting(true)
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit: true, sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCommitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="bg-layer border border-rim rounded-lg p-6 space-y-4">
      <div>
        <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider mb-1">Ingest Posts</h2>
        <p className="text-xs text-ink-3 mt-1">
          Paste 5-20 of your existing LinkedIn posts (separated by ---). The AI will extract
          your voice patterns, suggest templates, and update your style pack.
        </p>
      </div>
      <textarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        rows={10}
        placeholder={`Post 1 text here...\n---\nPost 2 text here...\n---\nPost 3 text here...`}
        className="w-full text-sm bg-well border border-groove rounded p-3 font-mono text-ink resize-y focus:outline-none focus:border-gold placeholder:text-ink-3"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-3">
          Separate posts with --- on its own line
        </span>
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !rawInput.trim()}
          className="px-4 py-2 bg-gold text-[#0c0c0c] text-sm font-medium rounded hover:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {analyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {patterns && !committed && (
        <div className="border-t border-rim pt-4 space-y-3">
          <h3 className="text-xs font-medium text-ink-2 uppercase tracking-wider">Analysis Results</h3>
          {(patterns.hook_types as string[])?.length > 0 && (
            <div>
              <p className="text-xs text-ink-3 mb-1">Hook types detected:</p>
              <div className="flex flex-wrap gap-1">
                {(patterns.hook_types as string[]).map((t: string) => (
                  <span key={t} className="bg-well text-ink-2 text-xs px-2 py-0.5 rounded border border-rim">{t}</span>
                ))}
              </div>
            </div>
          )}
          {(patterns.banned_phrase_candidates as string[])?.length > 0 && (
            <div>
              <p className="text-xs text-ink-3 mb-1">Phrases to avoid (will be added to banned list):</p>
              <div className="flex flex-wrap gap-1">
                {(patterns.banned_phrase_candidates as string[]).map((p: string) => (
                  <span key={p} className="bg-gold/10 text-gold text-xs px-2 py-0.5 rounded">{p}</span>
                ))}
              </div>
            </div>
          )}
          {(patterns.suggested_templates as unknown[])?.length > 0 && (
            <div>
              <p className="text-xs text-ink-3 mb-1">Templates to create:</p>
              <div className="space-y-1">
                {(patterns.suggested_templates as { name: string; mode_affinity: string }[]).map(
                  (t: { name: string; mode_affinity: string }, i: number) => (
                    <div key={i} className="text-xs bg-well rounded px-3 py-2 flex justify-between border border-rim">
                      <span className="text-ink-2">{t.name}</span>
                      <span className="text-ink-3">{t.mode_affinity}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleCommit}
              disabled={committing}
              className="px-4 py-2 bg-gold text-[#0c0c0c] text-sm font-medium rounded hover:bg-gold-dim disabled:opacity-50 transition-colors"
            >
              {committing ? 'Applying...' : 'Apply to Style Pack'}
            </button>
          </div>
        </div>
      )}

      {committed && (
        <div className="border-t border-rim pt-4">
          <p className="text-sm text-emerald-400">Style pack updated. Templates created.</p>
        </div>
      )}
    </div>
  )
}

export default function StyleCenterClient({ stylePack }: StyleCenterClientProps) {
  const [bannedPhrases, setBannedPhrases] = useState<string[]>(JSON.parse(stylePack.banned_phrases))
  const [voiceExamples, setVoiceExamples] = useState<string[]>(JSON.parse(stylePack.voice_examples))
  const [hashtagRules, setHashtagRules] = useState<{ min: number; max: number; preferred_tags: string[] }>(
    JSON.parse(stylePack.hashtag_rules)
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newExample, setNewExample] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/style-pack', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned_phrases: JSON.stringify(bannedPhrases),
          voice_examples: JSON.stringify(voiceExamples),
          hashtag_rules: JSON.stringify(hashtagRules),
        }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banned Phrases */}
      <div className="bg-layer border border-rim rounded-lg p-6 space-y-3">
        <div>
          <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider">Banned Phrases</h2>
          <p className="text-xs text-ink-3 mt-0.5">Guardrail checks will flag these in generated posts.</p>
        </div>
        <TagList
          items={bannedPhrases}
          onRemove={(i) => setBannedPhrases((prev) => prev.filter((_, idx) => idx !== i))}
          onAdd={(v) => setBannedPhrases((prev) => [...prev, v])}
          placeholder="Add phrase..."
        />
      </div>

      {/* Hashtag Rules */}
      <div className="bg-layer border border-rim rounded-lg p-6 space-y-3">
        <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider">Hashtag Rules</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Max hashtags</label>
            <input
              type="number"
              min={0}
              max={10}
              value={hashtagRules.max}
              onChange={(e) => setHashtagRules((prev) => ({ ...prev, max: Number(e.target.value) }))}
              className="w-full text-sm bg-well border border-groove rounded p-2 text-ink focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Preferred tags</label>
            <TagList
              items={hashtagRules.preferred_tags}
              onRemove={(i) =>
                setHashtagRules((prev) => ({
                  ...prev,
                  preferred_tags: prev.preferred_tags.filter((_, idx) => idx !== i),
                }))
              }
              onAdd={(v) =>
                setHashtagRules((prev) => ({ ...prev, preferred_tags: [...prev.preferred_tags, v] }))
              }
              placeholder="#hashtag"
            />
          </div>
        </div>
      </div>

      {/* Voice Examples */}
      <div className="bg-layer border border-rim rounded-lg p-6 space-y-3">
        <div>
          <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider">Voice Examples</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Real posts that exemplify your voice. Used to calibrate the system prompt.
          </p>
        </div>
        <div className="space-y-2">
          {voiceExamples.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={ex}
                onChange={(e) =>
                  setVoiceExamples((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
                rows={4}
                className="flex-1 text-sm bg-well border border-groove rounded p-2 resize-y font-mono text-ink focus:outline-none focus:border-gold"
              />
              <button
                onClick={() => setVoiceExamples((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-ink-3 hover:text-red-400 self-start mt-1 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <textarea
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            rows={4}
            placeholder="Paste a post that sounds like you..."
            className="w-full text-sm bg-well border border-groove rounded p-2 font-mono text-ink focus:outline-none focus:border-gold placeholder:text-ink-3"
          />
          <button
            onClick={() => {
              if (newExample.trim()) {
                setVoiceExamples((prev) => [...prev, newExample.trim()])
                setNewExample('')
              }
            }}
            className="text-xs border border-rim hover:border-groove rounded px-3 py-1.5 text-ink-3 hover:text-ink-2 transition-colors"
          >
            + Add example
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {saved && <p className="text-sm text-emerald-400">Saved.</p>}
        {!saved && <span />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-gold text-[#0c0c0c] text-sm font-medium rounded hover:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Style Pack'}
        </button>
      </div>

      {/* Ingest */}
      <IngestPanel />
    </div>
  )
}
