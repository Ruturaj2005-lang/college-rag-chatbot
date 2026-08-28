import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Sparkles,
  Shield,
  MessageSquare,
  LogOut,
  User as UserIcon,
  Layers,
  Menu,
  X,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  Check
} from 'lucide-react';
import { KnowledgeSearchBar } from '../search/KnowledgeSearchBar';
import { SupportedLanguage } from '../../types';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  native: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
];

export const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem('college_rag_lang') as SupportedLanguage) || 'en';
  });

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) {
        setSelectedLang(e.detail);
      }
    };
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    localStorage.setItem('college_rag_lang', lang);
    window.dispatchEvent(new CustomEvent('language-change', { detail: lang }));
    setIsLangOpen(false);
  };

  const isChat = location.pathname.startsWith('/chat');
  const isAdminDashboard = location.pathname === '/admin';
  const isAdminDocs = location.pathname.startsWith('/admin/documents');
  const isProfile = location.pathname === '/profile';

  const handleAsk = (question: string) => {
    navigate('/chat');
  };

  return (
    <header className="h-14 sm:h-16 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-xs gap-3 sm:gap-4 transition-colors">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <Link to="/chat" className="flex items-center gap-2 sm:gap-2.5 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#4B41E1] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
            <Sparkles className="w-4 h-4 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight" style={{ color: '#4B41E1' }}>
                VibrantAI
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#4B41E1]/15 text-[#4B41E1] font-mono uppercase tracking-wider hidden xs:inline">
                Pro
              </span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden md:block -mt-0.5 truncate">
              College Knowledge Assistant
            </span>
          </div>
        </Link>
      </div>

      {/* Desktop & Tablet Navigation & Controls */}
      <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <nav className="flex items-center gap-1">
          <Link
            to="/chat"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isChat
                ? 'bg-[#4B41E1] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </Link>

          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isAdminDashboard
                    ? 'bg-[#4B41E1] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </Link>

              <Link
                to="/admin/documents"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isAdminDocs
                    ? 'bg-[#4B41E1] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Documents</span>
              </Link>
            </>
          )}
        </nav>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Custom Multi-Language Selector Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-xs font-semibold text-gray-800 dark:text-gray-100 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Select Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#4B41E1]" />
            <span>{languages.find((l) => l.code === selectedLang)?.native || 'English'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isLangOpen ? 'rotate-180 text-[#4B41E1]' : ''}`} />
          </button>

          {isLangOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700/80 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
              <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Select Language
              </div>
              <div className="space-y-0.5">
                {languages.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#4B41E1] text-white font-bold shadow-xs'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#4B41E1] dark:hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{lang.flag}</span>
                        <div>
                          <div className="font-semibold leading-tight">{lang.native}</div>
                          {lang.name !== lang.native && (
                            <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                              {lang.name}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
        </button>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        {/* User Profile Monogram & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/profile"
            className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isProfile ? 'ring-2 ring-[#4B41E1]/40 bg-gray-100 dark:bg-gray-800' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#4B41E1] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 hidden lg:inline max-w-[90px] truncate">
              {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
            </span>
          </Link>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Actions (< sm) */}
      <div className="flex sm:hidden items-center gap-1.5">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <Link
          to="/profile"
          className="w-7 h-7 rounded-full bg-[#4B41E1] text-white flex items-center justify-center font-bold text-xs shadow-xs"
        >
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="sm:hidden absolute top-14 left-0 w-full bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 shadow-lg p-3 space-y-2.5 animate-in slide-in-from-top duration-150 z-50">
          <KnowledgeSearchBar onAskQuestion={handleAsk} />

          {/* Language Selector in Mobile Drawer */}
          <div className="p-2 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-[#4B41E1]" />
              <span>Language Selection</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {languages.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      handleSelectLanguage(lang.code);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#4B41E1] text-white shadow-xs'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.native}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <Link
              to="/chat"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isChat ? 'bg-[#4B41E1] text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat Session</span>
            </Link>

            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isAdminDashboard ? 'bg-[#4B41E1] text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Analytics</span>
                </Link>

                <Link
                  to="/admin/documents"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isAdminDocs ? 'bg-[#4B41E1] text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Manage Documents</span>
                </Link>
              </>
            )}

            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isProfile ? 'bg-[#4B41E1] text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile & Settings</span>
            </Link>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
