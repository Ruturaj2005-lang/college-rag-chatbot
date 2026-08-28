import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Shield,
  CheckCircle2,
  Loader2,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid college email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setIsLoading(true);
    try {
      await register(cleanEmail, password, fullName.trim(), role);
      navigate(role === 'admin' ? '/admin' : '/chat');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Cannot connect to backend server. Make sure "npm start" or "python run.py" is running on port 8000.');
      } else {
        setError(err.message || 'Registration failed. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAlreadyExistsError = error?.toLowerCase().includes('already exists');

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* LEFT SHOWCASE HERO PANEL */}
      <div className="w-full md:w-5/12 lg:w-1/2 bg-gradient-to-br from-[#160a2b] via-[#240f43] to-[#3a136b] text-white p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-surface-variant shadow-xl">
        {/* Ambient Glows */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-primary-container/20 filter blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 filter blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#4B41E1] flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0 text-white">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight block">
              VibrantAI
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#a5b4fc]">
              Pro Intelligence
            </span>
          </div>
        </div>

        {/* Hero Headline */}
        <div className="my-6 sm:my-10 lg:my-14 space-y-4 sm:space-y-6 max-w-lg relative z-10">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-[1.15] sm:leading-[1.1] tracking-tight text-white">
              Join the Campus{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-fixed via-purple-200 to-pink-200">
                Knowledge Network.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed pt-1">
              Create an account to ask questions with grounded citations, manage conversation threads, and access verified university records.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-2.5 pt-2 text-xs text-purple-100 font-medium">
            <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Full Access to College Document RAG Retrieval</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Persistent Conversation History & Transcripts</span>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="text-[11px] text-purple-300/70 font-mono flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4 relative z-10">
          <span>Apex Knowledge Engine</span>
          <span>Role-Based Authorization</span>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION CARD */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 bg-[#f8f9fb] dark:bg-[#0B0F17] transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-8 space-y-4 sm:space-y-5 shadow-sm">
          {/* Header */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Create an Account
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              Register as a student or administrator to get started.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 space-y-2 text-rose-800 dark:text-rose-300 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {isAlreadyExistsError && (
                <div className="pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4B41E1] text-white font-bold hover:bg-[#3b32c4] transition-colors text-[11px]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In With This Email</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1] transition-all shadow-2xs font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@college.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1] transition-all shadow-2xs font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1] transition-all shadow-2xs font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center gap-2 p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    role === 'student'
                      ? 'bg-[#4B41E1]/15 text-[#4B41E1] dark:text-[#818CF8] border-[#4B41E1] shadow-xs ring-1 ring-[#4B41E1]'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    role === 'admin'
                      ? 'bg-[#4B41E1]/15 text-[#4B41E1] dark:text-[#818CF8] border-[#4B41E1] shadow-xs ring-1 ring-[#4B41E1]'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Administrator</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#4B41E1] dark:text-[#818CF8] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
