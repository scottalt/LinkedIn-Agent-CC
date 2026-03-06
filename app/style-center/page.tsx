import { getStylePack } from '@/lib/db/queries/style-pack'
import StyleCenterClient from './StyleCenterClient'

export default function StyleCenterPage() {
  const stylePack = getStylePack()
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">Style Center</h1>
      <StyleCenterClient stylePack={stylePack} />
    </div>
  )
}
