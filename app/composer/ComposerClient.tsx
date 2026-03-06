'use client'

import { useState, useCallback } from 'react'
import type { Template, PostMode, CloserType } from '@/lib/db/types'
import type { GuardrailResult } from '@/lib/voice/guardrail'

interface Variation {
  content: string
  guardrail: GuardrailResult
}

function GuardrailBadge({ result }: { result: GuardrailResult }) {
  const map = {
    pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    fail: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={`border rounded px-2.5 py-1.5 text-xs ${map[result.status]}`}>
      <span className="font-medium capitalize">{result.status}</span>
      {result.violations.length > 0 && (
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          {result.violations.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function VariationCard({
  variation,
  index,
  onApprove,
  onTighten,
  tightening,
}: {
  variation: Variation
  index: number
  onApprove: (content: string) => void
  onTighten: (content: string, index: number) => void
  tightening: boolean
}) {
  const [content, setContent] = useState(variation.content)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Variation {index + 1}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTighten(content, index)}
            disabled={tightening}
            className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1 disabled:opacity-50"
          >
            {tightening ? 'Tightening...' : 'Tighten'}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        className="w-full text-sm text-zinc-800 border border-zinc-200 rounded p-3 resize-y focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
      />

      <GuardrailBadge result={variation.guardrail} />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => onApprove(content)}
          className="px-4 py-2 bg-zinc-900 text-white text-sm rounded hover:bg-zinc-700 transition-colors"
        >
          Approve &amp; Save
        </button>
      </div>
    </div>
  )
}

export default function ComposerClient({ templates }: { templates: Template[] }) {
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<PostMode>('engagement')
  const [ctaStyle, setCtaStyle] = useState<CloserType>('question')
  const [templateId, setTemplateId] = useState('')
  const [firstComment, setFirstComment] = useState('')
  const [variationCount, setVariationCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [tighteningIndex, setTighteningIndex] = useState<number | null>(null)
  const [variations, setVariations] = useState<Variation[]>([])
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setError('')
    setVariations([])
    setSavedId('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, mode, ctaStyle, templateId: templateId || undefined, variationCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVariations(data.variations)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleTighten = async (content: string, index: number) => {
    setTighteningIndex(index)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tighten', content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVariations((prev) =>
        prev.map((v, i) => (i === index ? { content: data.tightened, guardrail: data.guardrail } : v))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tighten failed')
    } finally {
      setTighteningIndex(null)
    }
  }

  const handleApprove = async (content: string) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mode,
          template_id: templateId || undefined,
          first_comment: firstComment || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Mark as approved
      await fetch(`/api/posts/${data.post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      setSavedId(data.post.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const filteredTemplates = templates.filter(
    (t) => t.mode_affinity === mode || t.mode_affinity === 'both'
  )

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Topic / Prompt</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="What do you want to post about?"
            className="w-full text-sm border border-zinc-200 rounded p-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PostMode)}
              className="w-full text-sm border border-zinc-200 rounded p-2 focus:outline-none"
            >
              <option value="engagement">Engagement</option>
              <option value="authority">Authority</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Closer</label>
            <select
              value={ctaStyle}
              onChange={(e) => setCtaStyle(e.target.value as CloserType)}
              className="w-full text-sm border border-zinc-200 rounded p-2 focus:outline-none"
            >
              <option value="question">Question</option>
              <option value="soft_cta">Soft CTA</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Variations</label>
            <select
              value={variationCount}
              onChange={(e) => setVariationCount(Number(e.target.value))}
              className="w-full text-sm border border-zinc-200 rounded p-2 focus:outline-none"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Template (optional)</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded p-2 focus:outline-none"
            >
              <option value="">No template</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">First comment (optional)</label>
            <input
              type="text"
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              placeholder="Add a first comment..."
              className="w-full text-sm border border-zinc-200 rounded p-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {savedId && (
            <p className="text-sm text-emerald-600">Saved as draft. <a href="/dashboard" className="underline">View dashboard</a></p>
          )}
          {!error && !savedId && <span />}
          <button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="px-5 py-2.5 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Variations */}
      {variations.length > 0 && (
        <div className="space-y-4">
          {variations.map((v, i) => (
            <VariationCard
              key={i}
              variation={v}
              index={i}
              onApprove={handleApprove}
              onTighten={handleTighten}
              tightening={tighteningIndex === i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
