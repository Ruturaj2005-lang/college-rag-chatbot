import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/chat');
    } catch (err: any) {
      console.error('Login error', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Cannot connect to backend server. Make sure "python run.py" is running on port 8000.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email.trim() || '');
    setForgotStep(1);
    setForgotError(null);
    setForgotSuccess(null);
    setResetCode('');
    setGeneratedCode(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowForgotModal(true);
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered college email.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotSuccess(res.message);
      if (res.reset_code) {
        setGeneratedCode(res.reset_code);
        setResetCode(res.reset_code); // Auto-fill for convenience
      }
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Could not find an account with this email.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);
    try {
      const res = await api.auth.resetPassword(
        forgotEmail.trim().toLowerCase(),
        resetCode.trim(),
        newPassword
      );
      setForgotSuccess(res.message);
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleFinishReset = () => {
    setEmail(forgotEmail.trim().toLowerCase());
    setPassword(newPassword);
    setShowForgotModal(false);
  };

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
              Institutional Knowledge,{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-fixed via-purple-200 to-pink-200">
                Answered in Seconds.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed pt-1">
              Real-time factual answers on admissions, syllabus, fees, hostel regulations, and examination calendars with verifiable page citations.
            </p>
          </div>

          {/* Key Bullet Highlights */}
          <div className="space-y-2 text-xs text-purple-100 font-medium pt-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Strict RAG Guardrails with Zero Hallucinations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Page-Level Citations from Official Documents</span>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="text-[11px] text-purple-300/70 font-mono flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4 relative z-10">
          <span>Apex University Knowledge Engine</span>
          <span>v2.0 • Electric Violet</span>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION CARD */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 bg-[#f8f9fb] dark:bg-[#0B0F17] transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-sm">
          {/* Form Header */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              Sign in with your student or administrator credentials.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
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
                  placeholder="student@college.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1] transition-all shadow-2xs font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-[11px] font-bold text-[#4B41E1] dark:text-[#818CF8] hover:underline cursor-pointer transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1] transition-all shadow-2xs font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? 'Signing In...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </form>

          {/* Switch to Register */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-[#4B41E1] dark:text-[#818CF8] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#4B41E1]/10 dark:bg-[#4B41E1]/20 flex items-center justify-center text-[#4B41E1]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Reset Password
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {forgotStep === 1 && 'Enter your college email to receive a verification code.'}
                  {forgotStep === 2 && 'Enter verification code and create a new password.'}
                  {forgotStep === 3 && 'Password successfully updated!'}
                </p>
              </div>
            </div>

            {/* Modal Error */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    College Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isForgotLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Enter Code & New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                {/* Code notification */}
                {generatedCode && (
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs text-violet-800 dark:text-violet-300 flex items-center justify-between">
                    <span>Demo Verification Code:</span>
                    <span className="font-mono font-bold text-sm tracking-wider bg-violet-200/60 dark:bg-violet-900/60 px-2 py-0.5 rounded-md">
                      {generatedCode}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm font-mono tracking-widest text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    New Password (min 6 chars)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F17] text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/20 focus:border-[#4B41E1]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-1/3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-2/3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isForgotLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {forgotStep === 3 && (
              <div className="space-y-5 text-center py-2 animate-in zoom-in-95">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                    Password Successfully Reset!
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    Your password has been updated. You can now sign in to the portal with your new credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFinishReset}
                  className="w-full py-3 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Proceed to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

