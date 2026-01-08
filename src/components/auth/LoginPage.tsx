import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Activity } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToSignup: () => void;
}

export function LoginPage({ onLogin, onSwitchToSignup }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-12 border border-white/60">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">TrackPro</h1>
                <p className="text-slate-600">Employee Tracking System</p>
              </div>
            </div>
            
            <div className="space-y-6 mt-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-slate-900">Real-time Monitoring</h3>
                  <p className="text-slate-600 mt-1">Track employee activity and productivity in real-time with automated screenshots</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-slate-900">Secure & Private</h3>
                  <p className="text-slate-600 mt-1">Enterprise-grade security with encrypted data storage and access controls</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 lg:hidden">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-slate-900">Welcome Back</h2>
              <p className="text-slate-500 mt-2">Sign in to your admin account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <button type="button" className="text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToSignup}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>

          <p className="text-center text-slate-500 mt-6">
            Secure admin access only
          </p>
        </div>
      </div>
    </div>
  );
}
