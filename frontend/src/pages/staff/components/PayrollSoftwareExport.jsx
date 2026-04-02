/**
 * Flowtym - Export Variables de Paie vers Logiciels Comptables
 * Phase 14 - Composant modal d'export Sage / Silae / Cegid / ADP / DSN
 */
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FileSpreadsheet, Download, CheckCircle2, AlertCircle, Info,
  Loader2, ExternalLink, FileText, FileJson, ChevronRight, Sparkles
} from 'lucide-react'

// ── Icônes / couleurs par logiciel ──────────────────────────────────────────
const SOFTWARE_META = {
  sage: {
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    iconBg: 'bg-green-100',
    icon: '🟢',
    formatIcon: FileSpreadsheet,
    formatColor: 'text-green-600',
  },
  silae: {
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    iconBg: 'bg-blue-100',
    icon: '🔵',
    formatIcon: FileSpreadsheet,
    formatColor: 'text-blue-600',
  },
  cegid: {
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    iconBg: 'bg-orange-100',
    icon: '🟠',
    formatIcon: FileText,
    formatColor: 'text-orange-600',
  },
  adp: {
    color: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    iconBg: 'bg-red-100',
    icon: '🔴',
    formatIcon: FileJson,
    formatColor: 'text-red-600',
  },
  dsn: {
    color: 'bg-violet-50 border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    iconBg: 'bg-violet-100',
    icon: '🟣',
    formatIcon: FileText,
    formatColor: 'text-violet-600',
  },
}

const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

// ── Composant principal ──────────────────────────────────────────────────────
export const PayrollSoftwareExport = ({ open, onClose, month, year }) => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()

  const [softwares, setSoftwares] = useState([])
  const [loadingSoftware, setLoadingSoftware] = useState(true)
  const [selected, setSelected] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadedSoftwares, setDownloadedSoftwares] = useState([])

  // Charger la liste des logiciels supportés
  useEffect(() => {
    if (!open || !currentHotel) return
    setLoadingSoftware(true)
    api.get(`/hotels/${currentHotel.id}/payroll-reports/software-list`)
      .then(res => {
        setSoftwares(res.data.softwares || [])
        if (res.data.softwares?.length > 0 && !selected) {
          setSelected(res.data.softwares[0].id)
        }
      })
      .catch(() => toast.error('Erreur lors du chargement des logiciels'))
      .finally(() => setLoadingSoftware(false))
  }, [open, currentHotel])

  const handleDownload = async () => {
    if (!selected || !currentHotel) return
    setDownloading(true)
    try {
      const response = await api.get(
        `/hotels/${currentHotel.id}/payroll-reports/export-software/${selected}`,
        {
          params: { month, year },
          responseType: 'blob',
        }
      )

      // Récupérer le nom de fichier depuis les headers
      const contentDisposition = response.headers?.['content-disposition'] || ''
      const fileNameMatch = contentDisposition.match(/filename=(.+)/)
      const sw = softwares.find(s => s.id === selected)
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : (sw?.filename_template || `export_${selected}_${month}_${year}`)
            .replace('{month}', String(month).padStart(2, '0'))
            .replace('{year}', String(year))

      // Déclencher le téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadedSoftwares(prev => [...new Set([...prev, selected])])
      toast.success(
        `Export ${sw?.name || selected} téléchargé avec succès`,
        { description: `Fichier : ${fileName}` }
      )
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Erreur lors de la génération du fichier'
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  const selectedSw = softwares.find(s => s.id === selected)
  const meta = SOFTWARE_META[selected] || {}
  const FormatIcon = meta.formatIcon || FileText

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl"
        data-testid="payroll-software-export-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Export vers logiciel de paie
          </DialogTitle>
          <DialogDescription>
            Téléchargez les variables de paie de{' '}
            <strong>{MONTHS_FR[month]} {year}</strong> au format de votre logiciel
          </DialogDescription>
        </DialogHeader>

        {/* Corps */}
        <div className="space-y-4 py-2">

          {/* Sélection du logiciel */}
          {loadingSoftware ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Chargement...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2" data-testid="software-list">
              {softwares.map(sw => {
                const m = SOFTWARE_META[sw.id] || {}
                const Icon = m.formatIcon || FileText
                const isSelected = selected === sw.id
                const isDone = downloadedSoftwares.includes(sw.id)

                return (
                  <button
                    key={sw.id}
                    onClick={() => setSelected(sw.id)}
                    data-testid={`software-option-${sw.id}`}
                    className={`
                      w-full text-left rounded-xl border-2 p-4 transition-all
                      flex items-center gap-4
                      ${isSelected
                        ? `${m.color || 'bg-violet-50 border-violet-300'} ring-2 ring-violet-400 ring-offset-1`
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }
                    `}
                  >
                    {/* Indicateur sélection */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-300'}
                    `}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Icône format */}
                    <div className={`p-2 rounded-lg flex-shrink-0 ${m.iconBg || 'bg-slate-100'}`}>
                      <Icon className={`h-5 w-5 ${m.formatColor || 'text-slate-500'}`} />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{sw.name}</span>
                        <Badge variant="outline" className={`text-xs ${m.badge || ''}`}>
                          {sw.format}
                        </Badge>
                        {isDone && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{sw.description}</p>
                    </div>

                    <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-violet-600' : 'text-slate-300'}`} />
                  </button>
                )
              })}
            </div>
          )}

          {/* Instructions pour le logiciel sélectionné */}
          {selectedSw && (
            <div
              className={`rounded-xl border p-4 space-y-2 ${meta.color || 'bg-slate-50 border-slate-200'}`}
              data-testid="software-instructions"
            >
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-slate-700 mb-1">
                    Comment utiliser ce fichier dans {selectedSw.name}
                  </p>
                  <p className="text-slate-600">{selectedSw.notes}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
                <span>📄 Format : <strong>{selectedSw.format}</strong></span>
                <span>📁 Extension : <strong>.{selectedSw.extension}</strong></span>
              </div>
            </div>
          )}

          {/* Avertissement si aucun employé */}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Le fichier est généré à partir des données de pointage et de planning de{' '}
              <strong>{MONTHS_FR[month]} {year}</strong>. Vérifiez que les pointages sont
              complets avant l'envoi à votre expert-comptable.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={downloading}>
            Fermer
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!selected || downloading || loadingSoftware}
            className="bg-violet-600 hover:bg-violet-700 text-white"
            data-testid="download-software-export-btn"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger pour {selectedSw?.name || '...'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PayrollSoftwareExport
