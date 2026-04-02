/**
 * EReputationModule - Module E-Réputation FlowTYM
 * 
 * Embed complet du module E-Réputation via iframe blob URL
 * Le module HTML contient déjà sa propre navigation interne
 */

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Import du HTML source comme texte brut
import ereputationHtml from './ereputation.html?raw'

export default function EReputationModule() {
  const iframeRef = useRef(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Créer un Blob URL depuis le HTML brut
    const blob = new Blob([ereputationHtml], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50">
      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loader while iframe is loading */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 gap-4">
            <Loader2 size={40} className="animate-spin text-violet-600" />
            <span className="text-sm text-slate-500 font-medium">
              Chargement module E-Réputation…
            </span>
          </div>
        )}

        {/* Iframe principal */}
        {blobUrl && (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            title="FlowTYM — E-Réputation"
            onLoad={() => setLoaded(true)}
            className="w-full h-full border-none"
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            allow="clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>
    </div>
  )
}
