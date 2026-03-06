import { getAllSettings } from '@/lib/db/queries/settings'
import SettingsClient from './SettingsClient'

export default function SettingsPage() {
  const settings = getAllSettings()
  // Mask keys for initial render
  const safe = { ...settings }
  if (safe.openai_api_key) safe.openai_api_key = '***'
  if (safe.anthropic_api_key) safe.anthropic_api_key = '***'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-6">Settings</h1>
      <SettingsClient initial={safe} />
    </div>
  )
}
