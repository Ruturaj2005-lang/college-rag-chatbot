import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, GraduationCap } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-forest-800 text-cream flex items-center justify-center shadow-md animate-pulse mb-3">
          <GraduationCap className="w-6 h-6 text-gold-300" />
        </div>
        <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-widest font-mono">
          Authenticating College Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-4">
        <div className="paper-card max-w-md w-full p-8 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-terracotta-50 text-terracotta-600 border border-terracotta-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-900">
            Administrator Access Required
          </h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            This section is reserved for university document managers and system administrators. You are currently authenticated with a student role.
          </p>
          <div className="pt-2">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-cream text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Student Chat</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
