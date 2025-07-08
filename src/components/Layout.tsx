import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Utensils,
  DollarSign,
  FileText,
  Settings,
  Building2,
  ChefHat,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  Users,
  Shield,
  Calendar
} from 'lucide-react';
import { useAuthContext } from '../hooks/useAuth';
import { canAccessRoute, getRoleDisplayName, hasPermission } from '../utils/permissions';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataEntryOpen, setDataEntryOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: Home, 
      current: location.pathname === '/',
      show: canAccessRoute(user.role, '/')
    },
    {
      name: 'Data Entry',
      icon: Utensils,
      current: location.pathname.startsWith('/daily') || location.pathname.startsWith('/indirect-costs'),
      show: canAccessRoute(user.role, '/daily') || canAccessRoute(user.role, '/indirect-costs'),
      children: [
        { 
          name: 'Meal Service Entry', 
          href: '/daily', 
          icon: Calendar, 
          current: location.pathname === '/daily',
          show: canAccessRoute(user.role, '/daily')
        },
        { 
          name: 'Indirect Costs', 
          href: '/indirect-costs', 
          icon: FileText, 
          current: location.pathname === '/indirect-costs',
          show: canAccessRoute(user.role, '/indirect-costs')
        },
      ].filter(item => item.show),
    },
    {
      name: 'Reports',
      icon: FileText,
      current: location.pathname.startsWith('/reports'),
      show: canAccessRoute(user.role, '/reports/weekly'),
      children: [
        { 
          name: 'Daily Report', 
          href: '/reports/daily', 
          icon: FileText, 
          current: location.pathname === '/reports/daily',
          show: canAccessRoute(user.role, '/reports/weekly')
        },
        { 
          name: 'Weekly Report', 
          href: '/reports/weekly', 
          icon: FileText, 
          current: location.pathname === '/reports/weekly',
          show: canAccessRoute(user.role, '/reports/weekly')
        },
        { 
          name: 'Monthly Report', 
          href: '/reports/monthly', 
          icon: FileText, 
          current: location.pathname === '/reports/monthly',
          show: canAccessRoute(user.role, '/reports/monthly')
        },
      ].filter(item => item.show),
    },
    {
      name: 'Settings',
      icon: Settings,
      current: location.pathname.startsWith('/settings'),
      show: canAccessRoute(user.role, '/settings/hospitals') || canAccessRoute(user.role, '/settings/ingredients'),
      children: [
        { 
          name: 'Hospitals', 
          href: '/settings/hospitals', 
          icon: Building2, 
          current: location.pathname === '/settings/hospitals',
          show: canAccessRoute(user.role, '/settings/hospitals')
        },
        { 
          name: 'Ingredients', 
          href: '/settings/ingredients', 
          icon: ChefHat, 
          current: location.pathname === '/settings/ingredients',
          show: canAccessRoute(user.role, '/settings/ingredients')
        },
      ].filter(item => item.show),
    },
    {
      name: 'Administration',
      icon: Shield,
      current: location.pathname.startsWith('/admin'),
      show: hasPermission(user.role, 'users', 'read'),
      children: [
        { 
          name: 'User Management', 
          href: '/admin/users', 
          icon: Users, 
          current: location.pathname === '/admin/users',
          show: hasPermission(user.role, 'users', 'read')
        },
      ].filter(item => item.show),
    },
  ].filter(item => item.show && (!item.children || item.children.length > 0));

  const toggleSubmenu = (section: string) => {
    switch (section) {
      case 'dataEntry':
        setDataEntryOpen(!dataEntryOpen);
        break;
      case 'reports':
        setReportsOpen(!reportsOpen);
        break;
      case 'settings':
        setSettingsOpen(!settingsOpen);
        break;
      case 'admin':
        setAdminOpen(!adminOpen);
        break;
    }
  };

  const getSubmenuState = (itemName: string) => {
    switch (itemName) {
      case 'Data Entry':
        return dataEntryOpen;
      case 'Reports':
        return reportsOpen;
      case 'Settings':
        return settingsOpen;
      case 'Administration':
        return adminOpen;
      default:
        return false;
    }
  };

  const getSubmenuKey = (itemName: string) => {
    switch (itemName) {
      case 'Data Entry':
        return 'dataEntry';
      case 'Reports':
        return 'reports';
      case 'Settings':
        return 'settings';
      case 'Administration':
        return 'admin';
      default:
        return '';
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setSidebarOpen(false)} 
          />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 bg-red-600 px-4">
          <h1 className="text-white text-xl font-bold">Hospital-CPM</h1>
          <button
            className="lg:hidden p-2 rounded-md text-red-200 hover:text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(getSubmenuKey(item.name))}
                    className={`${
                      item.current
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group w-full flex items-center justify-between pl-2 pr-1 py-2 border-l-4 text-sm font-medium transition-colors duration-150 ease-in-out`}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>
                    {getSubmenuState(item.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {getSubmenuState(item.name) && (
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={`${
                            child.current
                              ? 'bg-red-50 border-red-500 text-red-700'
                              : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center pl-8 pr-2 py-2 border-l-4 text-sm font-medium transition-colors duration-150 ease-in-out`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <child.icon className="mr-3 h-4 w-4" />
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={`${
                    item.current
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center pl-2 pr-2 py-2 border-l-4 text-sm font-medium transition-colors duration-150 ease-in-out`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-700">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-150"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;