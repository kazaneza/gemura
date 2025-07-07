import { UserRole, Permission, RolePermissions } from '../types/auth';

// Define permissions for each role
export const ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: [
    { resource: 'purchases', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'production', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'indirect-costs', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'schools', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'ingredients', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'historical-data', actions: ['read', 'update'] },
    { resource: 'system-settings', actions: ['read', 'update'] }
  ],
  DATA_ENTRY: [
    { resource: 'purchases', actions: ['create', 'read', 'update'] },
    { resource: 'production', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'schools', actions: ['read'] },
    { resource: 'ingredients', actions: ['create', 'read', 'update'] } // Added ingredient management for data entry
  ],
  VIEWER: [
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'schools', actions: ['read'] },
    { resource: 'ingredients', actions: ['read'] }
  ]
};

// Check if user has permission for a specific action on a resource
export const hasPermission = (
  userRole: UserRole,
  resource: string,
  action: string
): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  const resourcePermission = rolePermissions.find(p => p.resource === resource);
  
  if (!resourcePermission) {
    return false;
  }
  
  return resourcePermission.actions.includes(action);
};

// Check if user can access a route
export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
  const routePermissions: { [key: string]: { resource: string; action: string } } = {
    '/': { resource: 'reports', action: 'read' },
    '/daily': { resource: 'purchases', action: 'create' }, // Daily entry requires both purchase and production permissions
    '/purchases': { resource: 'purchases', action: 'create' },
    '/production': { resource: 'production', action: 'create' },
    '/indirect-costs': { resource: 'indirect-costs', action: 'create' },
    '/reports/daily': { resource: 'reports', action: 'read' },
    '/reports/weekly': { resource: 'reports', action: 'read' },
    '/reports/monthly': { resource: 'reports', action: 'read' },
    '/settings/schools': { resource: 'schools', action: 'update' },
    '/settings/ingredients': { resource: 'ingredients', action: 'update' },
    '/admin/users': { resource: 'users', action: 'read' }
  };

  const permission = routePermissions[route];
  if (!permission) {
    return true; // Allow access to undefined routes by default
  }

  // For daily entry, check both purchase and production permissions
  if (route === '/daily') {
    return hasPermission(userRole, 'purchases', 'create') && hasPermission(userRole, 'production', 'create');
  }

  return hasPermission(userRole, permission.resource, permission.action);
};

// Get user role display name
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames = {
    ADMIN: 'Administrator',
    DATA_ENTRY: 'Data Entry',
    VIEWER: 'Viewer'
  };
  
  return roleNames[role] || role;
};

// Get user role color for UI
export const getRoleColor = (role: UserRole): string => {
  const roleColors = {
    ADMIN: 'bg-red-100 text-red-800',
    DATA_ENTRY: 'bg-blue-100 text-blue-800',
    VIEWER: 'bg-gray-100 text-gray-800'
  };
  
  return roleColors[role] || 'bg-gray-100 text-gray-800';
};

// Check if user can edit historical data
export const canEditHistoricalData = (userRole: UserRole, date: string): boolean => {
  if (userRole === 'ADMIN') {
    return true; // Admins can edit any historical data
  }
  
  // Other roles follow standard edit restrictions
  const targetDate = new Date(date);
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);
  
  return targetDate >= oneMonthAgo && targetDate <= today;
};