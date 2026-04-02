import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Star, Send, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL

// ═══════════════════════════════════════════════════════════════════════════════
// STAR RATING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const StarRating = ({ value, onChange, label }) => {
  const [hover, setHover] = useState(0)
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              size={32}
              className={`transition-colors ${
                star <= (hover || value)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

const LanguageSelector = ({ languages, currentLang, onSelect }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-6">
      {Object.entries(languages).map(([code, info]) => (
        <button
          key={code}
          onClick={() => onSelect(code)}
          className={`px-3 py-2 rounded-lg text-lg transition-all ${
            currentLang === code
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-white border border-slate-200 hover:border-violet-300'
          }`}
          title={info.name}
        >
          {info.flag}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SatisfactionSurvey() {
  const { token } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  
  const [surveyData, setSurveyData] = useState(null)
  const [ratings, setRatings] = useState({})
  const [improvementText, setImprovementText] = useState('')
  const [currentLang, setCurrentLang] = useState(searchParams.get('lang') || 'fr')
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH SURVEY DATA
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true)
        const res = await axios.get(`${API_URL}/api/satisfaction/public/survey/${token}?lang=${currentLang}`)
        setSurveyData(res.data)
        
        // Initialize ratings
        const initialRatings = {}
        res.data.criteria.forEach(c => {
          initialRatings[c.key] = 0
        })
        setRatings(initialRatings)
      } catch (err) {
        console.error('Error fetching survey:', err)
        setError(err.response?.data?.detail || 'Impossible de charger le formulaire')
      } finally {
        setLoading(false)
      }
    }
    
    if (token) {
      fetchSurvey()
    }
  }, [token, currentLang])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LANGUAGE CHANGE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleLanguageChange = (lang) => {
    setCurrentLang(lang)
    setSearchParams({ lang })
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleSubmit = async () => {
    // Vérifier que tous les critères sont notés
    const allRated = Object.values(ratings).every(r => r > 0)
    if (!allRated) {
      return
    }
    
    setSubmitting(true)
    
    try {
      const res = await axios.post(`${API_URL}/api/satisfaction/public/survey/${token}`, {
        zone_id: surveyData.zone.id,
        language: currentLang,
        ratings,
        improvement_text: improvementText || null
      })
      
      setResult(res.data)
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting:', err)
      setError(err.response?.data?.detail || 'Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <Loader2 size={40} className="animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-sm">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }
  
  // Success state
  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {surveyData?.translations?.thank_you || "Merci !"}
          </h2>
          
          <p className="text-slate-600 mb-6">
            {result.message}
          </p>
          
          {/* Average rating display */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500 mb-2">Votre note moyenne</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-slate-900">{result.average_rating.toFixed(1)}</span>
              <Star size={28} className="fill-amber-400 text-amber-400" />
            </div>
          </div>
          
          {/* Review links for satisfied customers */}
          {result.is_satisfied && result.review_links?.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">{result.share_text}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {result.review_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    {link.platform}
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Survey form
  const translations = surveyData?.translations || {}
  const criteria = surveyData?.criteria || []
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-700 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Language selector */}
        <LanguageSelector
          languages={surveyData?.languages || {}}
          currentLang={currentLang}
          onSelect={handleLanguageChange}
        />
        
        {/* Survey card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
            <div className="text-sm opacity-80 mb-1">
              {surveyData?.hotel?.name} • {translations.room || "Chambre"} {surveyData?.zone?.room_number}
            </div>
            <h1 className="text-xl font-bold leading-tight">
              👉 {translations.title || "Votre avis compte"}
            </h1>
          </div>
          
          {/* Form */}
          <div className="p-6 space-y-6">
            <p className="text-slate-600 font-medium text-center">
              {translations.subtitle || "Comment évaluez-vous votre expérience ?"}
            </p>
            
            {/* Ratings */}
            <div className="space-y-5">
              {criteria.map(criterion => (
                <StarRating
                  key={criterion.key}
                  label={translations.criteria?.[criterion.key] || criterion.key}
                  value={ratings[criterion.key] || 0}
                  onChange={val => setRatings(prev => ({ ...prev, [criterion.key]: val }))}
                />
              ))}
            </div>
            
            {/* Improvement text */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                👉 {translations.improvement_question || "Que pouvons-nous améliorer ?"}
              </label>
              <Textarea
                placeholder={translations.improvement_placeholder || "Votre suggestion (facultatif)"}
                value={improvementText}
                onChange={e => setImprovementText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !Object.values(ratings).every(r => r > 0)}
              className="w-full h-12 text-lg bg-violet-600 hover:bg-violet-700"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Send size={18} className="mr-2" />
                  {translations.submit || "Envoyer"}
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-violet-200 text-xs mt-4">
          ⏱️ 1 minute • Flowtym
        </p>
      </div>
    </div>
  )
}
