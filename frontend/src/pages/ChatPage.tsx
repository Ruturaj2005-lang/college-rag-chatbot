import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { WelcomeScreen } from '../components/chat/WelcomeScreen';
import { Conversation, Message, SupportedLanguage } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateAndDownloadChatPdf } from '../lib/pdfExport';
import {
  AlertCircle,
  Menu,
  X,
  Plus,
  MessageSquare,
  History,
  Shield,
  User as UserIcon,
  Bot,
  Moon,
  Sun,
  Globe,
  Check,
  FileDown,
  Loader2
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem('college_rag_lang') as SupportedLanguage) || 'en';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      setActiveConvId(conversationId);
      loadConversationMessages(conversationId);
    } else {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [conversationId]);

  // Listen for language changes across components
  useEffect(() => {
    const handleLangEvent = (e: any) => {
      if (e.detail) {
        setSelectedLang(e.detail);
      }
    };
    window.addEventListener('language-change', handleLangEvent);
    return () => window.removeEventListener('language-change', handleLangEvent);
  }, []);

  // Trigger prompt if passed from another component (e.g. Search)
  useEffect(() => {
    if (location.state?.initialPrompt) {
      const prompt = location.state.initialPrompt;
      navigate(location.pathname, { replace: true, state: {} });
      handleSendMessage(prompt);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    localStorage.setItem('college_rag_lang', lang);
    window.dispatchEvent(new CustomEvent('language-change', { detail: lang }));
  };

  const loadConversations = async () => {
    try {
      const data = await api.conversations.list();
      setConversations(data);
    } catch (err: any) {
      console.error('Failed to load conversations', err);
    }
  };

  const loadConversationMessages = async (id: string) => {
    setIsLoadingMessages(true);
    setErrorBanner(null);
    try {
      const detail = await api.conversations.get(id);
      setMessages(detail.messages || []);
    } catch (err: any) {
      console.error('Failed to load messages', err);
      setErrorBanner('Could not load conversation history.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    setErrorBanner(null);
    const tempUserMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: tempUserMsgId,
      conversation_id: activeConvId || '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const currentLang = selectedLang || (localStorage.getItem('college_rag_lang') as SupportedLanguage) || 'en';
      const res = await api.chat.send(text, activeConvId || undefined, currentLang);

      const botMsg: Message = {
        id: res.message_id,
        conversation_id: res.conversation_id,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        confidence: res.confidence,
        grounded: res.grounded,
        created_at: new Date().toISOString(),
        suggested_followups: res.suggested_followups || [],
      };

      setMessages((prev) => [...prev, botMsg]);

      if (!activeConvId || activeConvId !== res.conversation_id) {
        setActiveConvId(res.conversation_id);
        navigate(`/chat/${res.conversation_id}`, { replace: true });
        loadConversations();
      }
    } catch (err: any) {
      console.error('Failed to send message', err);
      setErrorBanner(err.message || 'Failed to get answer from knowledge assistant.');
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    navigate('/chat');
    setIsMobileSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    navigate(`/chat/${id}`);
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteConversation = (deletedId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== deletedId));
    if (activeConvId === deletedId) {
      handleNewChat();
    }
  };

  const languageOptions: { code: SupportedLanguage; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी' },
    { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'es', label: 'Spanish', native: 'Español' },
    { code: 'fr', label: 'French', native: 'Français' },
  ];

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0B0F17] text-gray-900 dark:text-gray-100 flex flex-col md:flex-row h-screen h-[100dvh] overflow-hidden transition-colors">
      {/* DESKTOP & TABLET SIDEBAR */}
      <div className="hidden md:flex flex-shrink-0">
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          messages={messages}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onAskQuestion={handleSendMessage}
        />
      </div>

      {/* MOBILE TOP APP BAR WITH SEARCH & THEME TOGGLE */}
      <header className="md:hidden flex flex-col gap-2 p-3 w-full flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black tracking-tight" style={{ color: '#4B41E1' }}>
              VibrantAI
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>

            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg bg-[#4B41E1] text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            <Link
              to="/profile"
              className="w-7 h-7 rounded-full bg-[#4B41E1] text-white flex items-center justify-center font-bold text-xs shadow-xs"
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </Link>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER SIDEBAR OVERLAY */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div
            className="w-72 sm:w-80 h-full bg-white dark:bg-[#111827] relative shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800 z-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <ChatSidebar
              conversations={conversations}
              activeConvId={activeConvId}
              messages={messages}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onDeleteConversation={handleDeleteConversation}
              onAskQuestion={handleSendMessage}
            />
          </div>
        </div>
      )}

      {/* MAIN CHAT CANVAS */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#0B0F17] relative pb-14 md:pb-0 transition-colors">
        {/* TOP INTERACTIVE LANGUAGE & THEME BAR */}
        <div className="px-3 sm:px-6 py-2.5 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 z-10 shadow-xs flex-wrap">
          {/* Language Selection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1 flex-shrink-0">
              <Globe className="w-3.5 h-3.5 text-[#4B41E1]" />
              <span className="hidden sm:inline">Language:</span>
            </div>

            {languageOptions.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 active:scale-95 ${isSelected
                      ? 'bg-[#4B41E1] text-white shadow-xs font-bold'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#4B41E1]'
                    }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{lang.native}</span>
                  <span className={`text-[10px] opacity-70 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    ({lang.label})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Dark Mode Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono hidden xl:inline">
              Spoken & text queries in any language auto-search in English
            </span>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

            {/* Download PDF Button (Direct File Download, No Hyperlinks) */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  const currentConv = conversations.find((c) => c.id === activeConvId);
                  const title = currentConv?.title || (messages[0]?.content ? messages[0].content.slice(0, 40) : 'College Chat Transcript');
                  generateAndDownloadChatPdf(messages, title, isDark ? 'dark' : 'light');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:bg-[#4B41E1]/10 dark:hover:bg-[#4B41E1]/20 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#4B41E1] dark:hover:text-[#818CF8] transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Download Conversation as PDF File (No hyperlinks)"
              >
                <FileDown className="w-3.5 h-3.5 text-[#4B41E1] dark:text-[#818CF8]" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            )}

            {/* Prominent Dark/Light Theme Button on Chat Canvas */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-all shadow-2xs cursor-pointer"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-gray-600" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="mx-3 sm:mx-4 mt-2 sm:mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in z-10 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Message Thread Canvas */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 custom-scrollbar"
        >
          {messages.length === 0 && !isLoadingMessages ? (
            <WelcomeScreen onSelectQuestion={handleSendMessage} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onSendMessage={handleSendMessage}
                />
              ))}

              {/* Typing Indicator */}
              {isSending && (
                <div className="flex items-start gap-2.5 sm:gap-3 animate-in fade-in max-w-[900px] mx-auto w-full">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#4B41E1] text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-xs flex items-center gap-2">
                    <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Searching knowledge base
                    </span>
                    <div className="flex items-center gap-1 pl-1">
                      <span className="violet-dot" />
                      <span className="violet-dot" />
                      <span className="violet-dot" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isSending}
        />
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-14 sm:h-16 px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="flex flex-col items-center justify-center bg-[#4B41E1] text-white rounded-xl px-3 sm:px-4 py-1 active:scale-90 transition-transform cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-white" />
          <span className="text-[10px] sm:text-[11px] font-bold text-white mt-0.5">Chat</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 px-3 sm:px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-transform cursor-pointer"
        >
          <History className="w-4 h-4" />
          <span className="text-[10px] sm:text-[11px] font-bold mt-0.5">History</span>
        </button>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 px-3 sm:px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-transform"
          >
            <Shield className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] font-bold mt-0.5">Admin</span>
          </Link>
        )}

        <Link
          to="/profile"
          className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 px-3 sm:px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-transform"
        >
          <UserIcon className="w-4 h-4" />
          <span className="text-[10px] sm:text-[11px] font-bold mt-0.5">Profile</span>
        </Link>
      </nav>
    </div>
  );
};
