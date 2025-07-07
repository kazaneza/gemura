// Calculation utilities for business logic

export interface DailyCostData {
  date: string;
  ingredientCost: number;
  beneficiaries: number;
  meals: number;
}

export interface WeeklyCostData {
  totalIngredientCost: number;
  totalMeals: number;
  monthlyOverheadPerMeal: number;
}

export interface MonthlyCostData {
  totalIndirectCosts: number;
  totalMonthlyMeals: number;
}

// Auto-calculation functions

// Calculate total price for purchase items
export const calculateTotalPrice = (quantity: number, unitPrice: number): number => {
  return Math.round((quantity * unitPrice) * 100) / 100; // Round to 2 decimal places
};

// Calculate total kg for production
export const calculateTotalKg = (starchKg: number, vegetablesKg: number): number => {
  return Math.round((starchKg + vegetablesKg) * 100) / 100;
};

// Calculate meals from production data
export const calculateMeals = (
  starchKg: number, 
  vegetablesKg: number, 
  starchPortionsPerKg: number, 
  vegetablePortionsPerKg: number
): number => {
  const starchMeals = starchKg * starchPortionsPerKg;
  const vegetableMeals = vegetablesKg * vegetablePortionsPerKg;
  return Math.round(starchMeals + vegetableMeals);
};

// Daily CPM calculation: CPM = (ingredient cost / beneficiaries) + (15% overhead)
export const calculateDailyCPM = (data: DailyCostData): number => {
  if (data.beneficiaries <= 0) return 0;
  
  const ingredientCostPerMeal = data.ingredientCost / data.beneficiaries;
  const overhead = ingredientCostPerMeal * 0.15; // 15% overhead
  
  return Math.round((ingredientCostPerMeal + overhead) * 100) / 100;
};

// Weekly CPM calculation: CPM = (total ingredient cost / total meals) + monthly overhead per meal
export const calculateWeeklyCPM = (data: WeeklyCostData): number => {
  if (data.totalMeals <= 0) return 0;
  
  const ingredientCostPerMeal = data.totalIngredientCost / data.totalMeals;
  const totalCPM = ingredientCostPerMeal + data.monthlyOverheadPerMeal;
  
  return Math.round(totalCPM * 100) / 100;
};

// Monthly overhead per meal calculation
export const calculateMonthlyOverheadPerMeal = (data: MonthlyCostData): number => {
  if (data.totalMonthlyMeals <= 0) return 0;
  
  return Math.round((data.totalIndirectCosts / data.totalMonthlyMeals) * 100) / 100;
};

// Calculate percentage change
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 10000) / 100; // Round to 2 decimal places
};

// Calculate average from array of numbers
export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
};

// Calculate sum of array
export const calculateSum = (values: number[]): number => {
  return Math.round(values.reduce((acc, val) => acc + val, 0) * 100) / 100;
};

// Calculate efficiency percentage
export const calculateEfficiency = (actual: number, target: number): number => {
  if (target === 0) return 0;
  return Math.round((actual / target) * 10000) / 100;
};

// Generate week identifier from date
export const generateWeekId = (date: Date): string => {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${weekNumber}`;
};

// Get week number from date
export const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Format currency for display
export const formatCurrency = (amount: number): string => {
  return `RWF ${Math.round(amount).toLocaleString()}`;
};

// Format percentage for display
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};