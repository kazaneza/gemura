// Data integrity and audit utilities

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'PURCHASE' | 'PRODUCTION' | 'INDIRECT_COST' | 'SCHOOL' | 'INGREDIENT';
  entityId: string;
  oldData?: any;
  newData?: any;
  changes?: string[];
}

export interface DataDependency {
  entityType: string;
  entityId: string;
  dependentReports: string[];
  canDelete: boolean;
  reason?: string;
}

// Audit logging functions
export const createAuditLog = (
  userId: string,
  action: AuditLog['action'],
  entityType: AuditLog['entityType'],
  entityId: string,
  oldData?: any,
  newData?: any
): AuditLog => {
  const changes: string[] = [];
  
  if (oldData && newData) {
    // Compare objects and track changes
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes.push(`${key}: ${oldData[key]} → ${newData[key]}`);
      }
    });
  }

  return {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    userId,
    action,
    entityType,
    entityId,
    oldData,
    newData,
    changes: changes.length > 0 ? changes : undefined
  };
};

// Generate unique audit ID
const generateAuditId = (): string => {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Check if data can be deleted based on dependencies
export const checkDataDependencies = (
  entityType: string,
  entityId: string,
  existingReports: any[]
): DataDependency => {
  const dependentReports: string[] = [];
  let canDelete = true;
  let reason = '';

  switch (entityType) {
    case 'PURCHASE':
      // Check if purchase is used in weekly/monthly reports
      const purchaseReports = existingReports.filter(report => 
        report.purchases?.some((p: any) => p.id === entityId)
      );
      dependentReports.push(...purchaseReports.map(r => r.id));
      
      if (dependentReports.length > 0) {
        canDelete = false;
        reason = 'Purchase data is referenced in existing reports';
      }
      break;

    case 'PRODUCTION':
      // Check if production is used in reports
      const productionReports = existingReports.filter(report => 
        report.production?.some((p: any) => p.id === entityId)
      );
      dependentReports.push(...productionReports.map(r => r.id));
      
      if (dependentReports.length > 0) {
        canDelete = false;
        reason = 'Production data is referenced in existing reports';
      }
      break;

    case 'INDIRECT_COST':
      // Check if indirect cost affects monthly calculations
      const costReports = existingReports.filter(report => 
        report.indirectCosts?.some((c: any) => c.id === entityId)
      );
      dependentReports.push(...costReports.map(r => r.id));
      
      if (dependentReports.length > 0) {
        canDelete = false;
        reason = 'Indirect cost affects monthly overhead calculations';
      }
      break;

    case 'SCHOOL':
      // Check if school has production data
      const schoolReports = existingReports.filter(report => 
        report.schools?.some((s: any) => s.id === entityId)
      );
      dependentReports.push(...schoolReports.map(r => r.id));
      
      if (dependentReports.length > 0) {
        canDelete = false;
        reason = 'School has associated production data';
      }
      break;

    case 'INGREDIENT':
      // Check if ingredient is used in purchases
      const ingredientReports = existingReports.filter(report => 
        report.purchases?.some((p: any) => p.ingredientId === entityId)
      );
      dependentReports.push(...ingredientReports.map(r => r.id));
      
      if (dependentReports.length > 0) {
        canDelete = false;
        reason = 'Ingredient is used in existing purchases';
      }
      break;
  }

  return {
    entityType,
    entityId,
    dependentReports,
    canDelete,
    reason: canDelete ? undefined : reason
  };
};

// Check if data can be edited based on date restrictions
export const checkEditPermissions = (
  entityDate: string,
  currentDate: Date = new Date(),
  allowedMonths: number = 1
): { canEdit: boolean; reason?: string } => {
  const dataDate = new Date(entityDate);
  const cutoffDate = new Date(currentDate);
  cutoffDate.setMonth(cutoffDate.getMonth() - allowedMonths);

  if (dataDate < cutoffDate) {
    return {
      canEdit: false,
      reason: `Data older than ${allowedMonths} month(s) cannot be edited`
    };
  }

  if (dataDate > currentDate) {
    return {
      canEdit: false,
      reason: 'Future data cannot be edited'
    };
  }

  return { canEdit: true };
};

// Validate data consistency across related entities
export const validateDataConsistency = (data: {
  purchases?: any[];
  production?: any[];
  indirectCosts?: any[];
  schools?: any[];
}): { isConsistent: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check if production schools exist in schools list
  if (data.production && data.schools) {
    data.production.forEach(prod => {
      const schoolExists = data.schools!.some(school => school.id === prod.schoolId);
      if (!schoolExists) {
        issues.push(`Production entry references non-existent school: ${prod.schoolName}`);
      }
    });
  }

  // Check if purchase ingredients are valid
  if (data.purchases) {
    data.purchases.forEach(purchase => {
      if (!purchase.ingredientId || !purchase.ingredientName) {
        issues.push(`Purchase entry missing ingredient information: ${purchase.id}`);
      }
    });
  }

  // Check date consistency
  const allDates = [
    ...(data.purchases?.map(p => p.date) || []),
    ...(data.production?.map(p => p.date) || []),
    ...(data.indirectCosts?.map(c => c.date) || [])
  ];

  allDates.forEach(date => {
    if (new Date(date) > new Date()) {
      issues.push(`Future date found: ${date}`);
    }
  });

  return {
    isConsistent: issues.length === 0,
    issues
  };
};

// Auto-save functionality for data recovery
export const createAutoSave = (data: any, entityType: string): void => {
  const autoSaveKey = `autosave_${entityType}_${Date.now()}`;
  const autoSaveData = {
    timestamp: new Date().toISOString(),
    data,
    entityType
  };

  try {
    localStorage.setItem(autoSaveKey, JSON.stringify(autoSaveData));
    
    // Clean up old auto-saves (keep only last 5)
    const allKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(`autosave_${entityType}_`)
    );
    
    if (allKeys.length > 5) {
      allKeys.sort().slice(0, -5).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.warn('Auto-save failed:', error);
  }
};

// Recover auto-saved data
export const recoverAutoSave = (entityType: string): any | null => {
  try {
    const allKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(`autosave_${entityType}_`)
    );
    
    if (allKeys.length === 0) return null;
    
    // Get the most recent auto-save
    const latestKey = allKeys.sort().pop();
    if (!latestKey) return null;
    
    const autoSaveData = localStorage.getItem(latestKey);
    if (!autoSaveData) return null;
    
    const parsed = JSON.parse(autoSaveData);
    
    // Check if auto-save is recent (within last hour)
    const saveTime = new Date(parsed.timestamp);
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (saveTime > hourAgo) {
      return parsed.data;
    }
    
    return null;
  } catch (error) {
    console.warn('Auto-save recovery failed:', error);
    return null;
  }
};