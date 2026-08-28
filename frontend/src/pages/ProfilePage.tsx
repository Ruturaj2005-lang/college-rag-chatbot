import React from 'react';
import { Header } from '../components/common/Header';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Mail,
  Shield,
  Clock,
  Sparkles,
  Database,
  CheckCircle2,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-chat-canvas dark:bg-[#0B0F17] flex flex-col transition-colors">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Back navigation */}
        <Link
          to="/chat"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B41E1] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Chat</span>
        </Link>

        {/* Profile Card Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-[#4B41E1] text-white flex items-center justify-center text-3xl font-extrabold shadow-md flex-shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Profile Info */}
            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {user?.full_name || 'College Student'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-[#4B41E1]/15 text-[#4B41E1] border border-[#4B41E1]/30'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  {user?.role || 'student'}
                </span>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {user?.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified User Profile</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Details Box */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
            Institutional Account Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-1">
              <span className="text-gray-400 uppercase text-[10px] font-bold">Email Address</span>
              <div className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {user?.email}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-1">
              <span className="text-gray-400 uppercase text-[10px] font-bold">Role & Access</span>
              <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {user?.role === 'admin' ? 'Knowledge Base Administrator' : 'Verified Student'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
