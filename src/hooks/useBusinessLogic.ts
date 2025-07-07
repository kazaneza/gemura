// Custom hook for business logic operations

import { useState, useCallback, useEffect } from 'react';
import { 
  validatePurchaseItems, 
  validateProductionEntries, 
  validateIndirectCost,
  ValidationResult 
} from '../utils/validation';
import { 
  calculateTotalPrice, 
  calculateTotalKg, 
  calculateMeals,
  calculateDailyCPM,
  calculateWeeklyCPM,
  calculateMonthlyOverheadPerMeal 
} from '../utils/calculations';
import { 
  createAuditLog, 
  checkDataDependencies, 
  checkEditPermissions,
  createAutoSave,
  recoverAutoSave 
} from '../utils/dataIntegrity';
import { 
  ensureWeekRecordExists, 
  updateWeekSummary, 
  recalculateMonthlyOverhead,
  WeekRecord 
} from '../utils/weeklyRecords';

export interface BusinessLogicState {
  isLoading: boolean;
  errors: string[];
  warnings: string[];
  auditLogs: any[];
  weekRecords: WeekRecord[];
}

export const useBusinessLogic = () => {
  const [state, setState] = useState<BusinessLogicState>({
    isLoading: false,
    errors: [],
    warnings: [],
    auditLogs: [],
    weekRecords: []
  });

  // Auto-save functionality
  const autoSave = useCallback((data: any, entityType: string) => {
    createAutoSave(data, entityType);
  }, []);

  // Validation functions
  const validatePurchase = useCallback((items: any[]): ValidationResult => {
    return validatePurchaseItems(items);
  }, []);

  const validateProduction = useCallback((entries: any[]): ValidationResult => {
    return validateProductionEntries(entries);
  }, []);

  const validateIndirectCostEntry = useCallback((cost: any): ValidationResult => {
    return validateIndirectCost(cost);
  }, []);

  // Calculation functions
  const calculatePurchaseTotal = useCallback((quantity: number, unitPrice: number): number => {
    return calculateTotalPrice(quantity, unitPrice);
  }, []);

  const calculateProductionTotal = useCallback((starchKg: number, vegetablesKg: number): number => {
    return calculateTotalKg(starchKg, vegetablesKg);
  }, []);

  const calculateProductionMeals = useCallback((
    starchKg: number, 
    vegetablesKg: number, 
    starchPortions: number, 
    vegetablePortions: number
  ): number => {
    return calculateMeals(starchKg, vegetablesKg, starchPortions, vegetablePortions);
  }, []);

  const calculateCostPerMeal = useCallback((
    type: 'daily' | 'weekly',
    data: any
  ): number => {
    if (type === 'daily') {
      return calculateDailyCPM(data);
    } else {
      return calculateWeeklyCPM(data);
    }
  }, []);

  // Data integrity functions
  const checkCanDelete = useCallback((entityType: string, entityId: string, reports: any[]) => {
    return checkDataDependencies(entityType, entityId, reports);
  }, []);

  const checkCanEdit = useCallback((entityDate: string) => {
    return checkEditPermissions(entityDate);
  }, []);

  const logAction = useCallback((
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    oldData?: any,
    newData?: any
  ) => {
    const auditLog = createAuditLog(userId, action, entityType as any, entityId, oldData, newData);
    setState(prev => ({
      ...prev,
      auditLogs: [...prev.auditLogs, auditLog]
    }));
    return auditLog;
  }, []);

  // Week management functions
  const ensureWeekExists = useCallback((date: string) => {
    const weekRecord = ensureWeekRecordExists(date, state.weekRecords);
    
    if (!state.weekRecords.find(w => w.weekId === weekRecord.weekId)) {
      setState(prev => ({
        ...prev,
        weekRecords: [...prev.weekRecords, weekRecord]
      }));
    }
    
    return weekRecord;
  }, [state.weekRecords]);

  const updateWeekData = useCallback((weekId: string, dailyEntries: any[], overheadPerMeal: number = 0) => {
    setState(prev => {
      const weekRecord = prev.weekRecords.find(w => w.weekId === weekId);
      if (!weekRecord) return prev;

      const updatedWeek = updateWeekSummary(weekRecord, dailyEntries, overheadPerMeal);
      
      return {
        ...prev,
        weekRecords: prev.weekRecords.map(w => w.weekId === weekId ? updatedWeek : w)
      };
    });
  }, []);

  const recalculateOverhead = useCallback((indirectCosts: any[], monthlyMeals: number) => {
    const { overheadPerMeal, updatedWeeks } = recalculateMonthlyOverhead(
      indirectCosts, 
      monthlyMeals, 
      state.weekRecords
    );

    setState(prev => ({
      ...prev,
      weekRecords: updatedWeeks
    }));

    return overheadPerMeal;
  }, [state.weekRecords]);

  // Error handling
  const setErrors = useCallback((errors: string[]) => {
    setState(prev => ({ ...prev, errors }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  const setWarnings = useCallback((warnings: string[]) => {
    setState(prev => ({ ...prev, warnings }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  // Recovery functions
  const recoverData = useCallback((entityType: string) => {
    return recoverAutoSave(entityType);
  }, []);

  // Initialize with any recovered data
  useEffect(() => {
    const recoveredWeeks = recoverAutoSave('WEEK_RECORDS');
    if (recoveredWeeks) {
      setState(prev => ({
        ...prev,
        weekRecords: recoveredWeeks,
        warnings: ['Recovered unsaved week data from previous session']
      }));
    }
  }, []);

  return {
    // State
    ...state,
    
    // Validation
    validatePurchase,
    validateProduction,
    validateIndirectCostEntry,
    
    // Calculations
    calculatePurchaseTotal,
    calculateProductionTotal,
    calculateProductionMeals,
    calculateCostPerMeal,
    
    // Data integrity
    checkCanDelete,
    checkCanEdit,
    logAction,
    
    // Week management
    ensureWeekExists,
    updateWeekData,
    recalculateOverhead,
    
    // Error handling
    setErrors,
    clearErrors,
    setWarnings,
    setLoading,
    
    // Auto-save and recovery
    autoSave,
    recoverData
  };
};