import React, { ReactNode } from 'react';
import { useAuthContext } from '../../hooks/useAuth';
import { canAccessRoute } from '../../utils/permissions';
import { AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  route: string;
  fallback?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  route, 
  fallback 
}) => {
  const { user, isAuthenticated } = useAuthContext();

  if (!isAuthenticated || !user) {
    return null; // This will be handled by the main App component
  }

  const hasAccess = canAccessRoute(user.role, route);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 text-center mb-4">
            You don't have permission to access this page.
          </p>
          <div className="text-sm text-gray-500 text-center">
            Your role: <span className="font-medium">{user.role}</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;