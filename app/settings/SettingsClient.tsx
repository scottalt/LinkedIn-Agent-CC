'use client'

import { useState } from 'react'

interface SettingsData {
  llm_provider: string
  llm_model: string
  openai_api_key: string
  anthropic_api_key: string
  playwright_enabled: string
  engagement_weights: string
  mix_target_engagement: string
  mix_target_authority: string
  posting_time_windows: string
}

export default function SettingsClient({ initial }: { initial: Record<string, string> }) {
  const [settings, setSettings] = useState<SettingsData>({
    llm_provider: initial.llm_provider ?? 'openai',
    llm_model: initial.llm_model ?? 'gpt-4o',
    openai_api_key: '',
    anthropic_api_key: '',
    playwright_enabled: initial.playwright_enabled ?? 'false',
    engagement_weights: initial.engagement_weights ?? '{"saves":4,"comments":3,"reposts":2,"likes":1}',
    mix_target_engagement: initial.mix_target_engagement ?? '3',
    mix_target_authority: initial.mix_target_authority ?? '2',
    posting_time_windows: initial.posting_time_windows ?? '["09:00","12:00","17:00"]',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const update = (key: keyof SettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, string> = { ...settings }
      // Don't send empty key strings (keep existing)
      if (!payload.openai_api_key) delete payload.openai_api_key
      if (!payload.anthropic_api_key) delete payload.anthropic_api_key

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const models: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  }

  const engWeights = (() => {
    try {
      return JSON.parse(settings.engagement_weights)
    } catch {
      return { saves: 4, comments: 3, reposts: 2, likes: 1 }
    }
  })()

  const updateWeight = (key: string, val: number) => {
    update('engagement_weights', JSON.stringify({ ...engWeights, [key]: val }))
  }

  return (
    <div className="space-y-6">
      {/* LLM */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">LLM Provider</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Provider</label>
            <select
              value={settings.llm_provider}
              onChange={(e) => {
                update('llm_provider', e.target.value)
                update('llm_model', models[e.target.value][0])
              }}
              className="w-full text-sm border border-zinc-200 rounded p-2"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Model</label>
            <select
              value={settings.llm_model}
              onChange={(e) => update('llm_model', e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded p-2"
            >
              {(models[settings.llm_provider] ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={settings.openai_api_key}
              onChange={(e) => update('openai_api_key', e.target.value)}
              placeholder={initial.openai_api_key === '***' ? 'Set (hidden)' : 'sk-...'}
              className="w-full text-sm border border-zinc-200 rounded p-2"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Anthropic API Key</label>
            <input
              type="password"
              value={settings.anthropic_api_key}
              onChange={(e) => update('anthropic_api_key', e.target.value)}
              placeholder={initial.anthropic_api_key === '***' ? 'Set (hidden)' : 'sk-ant-...'}
              className="w-full text-sm border border-zinc-200 rounded p-2"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          Keys are stored in the local SQLite database. Never committed to git.
          Alternatively, set OPENAI_API_KEY or ANTHROPIC_API_KEY env vars in .env.local.
        </p>
      </section>

      {/* Scoring */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Engagement Weights</h2>
        <p className="text-xs text-zinc-400">Used to compute engagement and authority scores (0-100).</p>
        <div className="grid grid-cols-4 gap-4">
          {(['saves', 'comments', 'reposts', 'likes'] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs text-zinc-500 mb-1 capitalize">{key}</label>
              <input
                type="number"
                min={0}
                max={10}
                value={engWeights[key] ?? 1}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="w-full text-sm border border-zinc-200 rounded p-2"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Mix Target */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Post Mix Target</h2>
        <p className="text-xs text-zinc-400">Target ratio of engagement to authority posts per week.</p>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Engagement</label>
            <input
              type="number"
              min={1}
              value={settings.mix_target_engagement}
              onChange={(e) => update('mix_target_engagement', e.target.value)}
              className="w-20 text-sm border border-zinc-200 rounded p-2"
            />
          </div>
          <span className="text-zinc-400 mt-4">:</span>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Authority</label>
            <input
              type="number"
              min={1}
              value={settings.mix_target_authority}
              onChange={(e) => update('mix_target_authority', e.target.value)}
              className="w-20 text-sm border border-zinc-200 rounded p-2"
            />
          </div>
        </div>
      </section>

      {/* Playwright */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Playwright Automation</h2>
        <p className="text-xs text-zinc-400">
          When enabled: save LinkedIn drafts and fetch engagement stats via browser automation.
          Use at your own risk — automated LinkedIn interactions may violate their ToS.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.playwright_enabled === 'true'}
            onChange={(e) => update('playwright_enabled', e.target.checked ? 'true' : 'false')}
            className="rounded"
          />
          <span className="text-sm text-zinc-700">Enable Playwright automation</span>
        </label>
      </section>

      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        {!error && !saved && <span />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-zinc-900 text-white text-sm rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
