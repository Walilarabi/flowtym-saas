import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail, Building2, Shield, Clock, Users } from 'lucide-react'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await login(formData.email, formData.password)
      toast.success('Connexion réussie')
      
      // Redirection selon le rôle
      const role = response?.user?.role || 'admin'
      
      if (role === 'superadmin' || role === 'super_admin') {
        navigate('/superadmin')
      } else if (role === 'support') {
        navigate('/support-agent')
      } else {
        navigate('/pms/planning')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Flowtym</h1>
          </div>
          <p className="text-violet-200 text-lg">Property Management System</p>
        </div>
        
        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Simplifiez la gestion<br />de votre hôtel
          </h2>
          <p className="text-violet-200 text-lg max-w-md">
            Une plateforme tout-en-un pour gérer vos réservations, 
            votre personnel et optimiser l'expérience client.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm">Gain de temps</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm">100% Sécurisé</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-sm">Multi-utilisateurs</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-sm">Multi-hôtels</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-violet-300 text-sm">
          © 2026 Flowtym. Tous droits réservés.
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Flowtym</h1>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Bienvenue</h2>
              <p className="text-slate-500">Connectez-vous pour accéder à votre espace</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vous@exemple.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-slate-800 placeholder-slate-400"
                    data-testid="input-email"
                    autoComplete="email"
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-slate-800 placeholder-slate-400"
                    data-testid="input-password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-slate-600">Se souvenir de moi</span>
                </label>
                <a href="#" className="text-violet-600 hover:text-violet-700 font-medium">
                  Mot de passe oublié ?
                </a>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-violet-800 focus:ring-4 focus:ring-violet-500/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="btn-submit-login"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <span>Se connecter</span>
                )}
              </button>
            </form>
            
            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Lock className="h-4 w-4" />
                <span>Connexion sécurisée SSL</span>
              </div>
            </div>
          </div>
          
          {/* Help Text */}
          <p className="text-center text-slate-500 text-sm mt-6">
            Besoin d'aide ? <a href="#" className="text-violet-600 hover:underline">Contactez le support</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
