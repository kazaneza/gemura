// Monthly system utilities for fresh monthly starts

export interface MonthInfo {
  year: number;
  month: number;
  monthName: string;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

export interface MonthlyContext {
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  canEditMonth: (month: MonthInfo) => boolean;
}

// Generate available months (current + past 12 + future 3)
export const generateAvailableMonths = (): MonthInfo[] => {
  const months: MonthInfo[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Add past 12 months
  for (let i = 12; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    months.push({
      year,
      month,
      monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isCurrentMonth: year === currentYear && month === currentMonth,
      isFutureMonth: false
    });
  }

  // Add future 3 months for planning
  for (let i = 1; i <= 3; i++) {
    const date = new Date(currentYear, currentMonth - 1 + i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    months.push({
      year,
      month,
      monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isCurrentMonth: false,
      isFutureMonth: true
    });
  }

  return months;
};

// Get current month info
export const getCurrentMonth = (): MonthInfo => {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    monthName: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    isCurrentMonth: true,
    isFutureMonth: false
  };
};

// Check if a month can be edited (ALL months can now be edited)
export const canEditMonth = (monthInfo: MonthInfo): boolean => {
  // Allow editing of all months - past, current, and future
  return true;
};

// Get month identifier string
export const getMonthId = (monthInfo: MonthInfo): string => {
  return `${monthInfo.year}-${monthInfo.month.toString().padStart(2, '0')}`;
};

// Parse month identifier back to MonthInfo
export const parseMonthId = (monthId: string): MonthInfo => {
  const [yearStr, monthStr] = monthId.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const date = new Date(year, month - 1, 1);
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  return {
    year,
    month,
    monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    isCurrentMonth: year === currentYear && month === currentMonth,
    isFutureMonth: (year > currentYear) || (year === currentYear && month > currentMonth)
  };
};

// Check if month is locked (NO months are locked now - all can be edited)
export const isMonthLocked = (monthInfo: MonthInfo): boolean => {
  // Allow editing of all months
  return false;
};

// Get month status for UI display (updated to show all months as editable)
export const getMonthStatus = (monthInfo: MonthInfo): {
  status: 'past' | 'current' | 'future';
  canEdit: boolean;
  statusText: string;
  statusColor: string;
} => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  if (monthInfo.year < currentYear || (monthInfo.year === currentYear && monthInfo.month < currentMonth)) {
    return {
      status: 'past',
      canEdit: true, // Changed from false to true
      statusText: 'Past (Editable)',
      statusColor: 'bg-blue-100 text-blue-800' // Changed color to indicate editability
    };
  } else if (monthInfo.year === currentYear && monthInfo.month === currentMonth) {
    return {
      status: 'current',
      canEdit: true,
      statusText: 'Current',
      statusColor: 'bg-green-100 text-green-800'
    };
  } else {
    return {
      status: 'future',
      canEdit: true,
      statusText: 'Future',
      statusColor: 'bg-purple-100 text-purple-800'
    };
  }
};

// Calculate month-to-month changes for ingredients
export const calculateIngredientChanges = (
  currentMonthIngredients: any[],
  previousMonthIngredients: any[]
): { added: any[]; updated: any[]; unchanged: any[] } => {
  const added: any[] = [];
  const updated: any[] = [];
  const unchanged: any[] = [];

  currentMonthIngredients.forEach(current => {
    const previous = previousMonthIngredients.find(p => p.name === current.name);
    
    if (!previous) {
      added.push(current);
    } else if (previous.lastPrice !== current.lastPrice) {
      updated.push({
        ...current,
        previousPrice: previous.lastPrice,
        priceChange: current.lastPrice - previous.lastPrice,
        percentageChange: ((current.lastPrice - previous.lastPrice) / previous.lastPrice) * 100
      });
    } else {
      unchanged.push(current);
    }
  });

  return { added, updated, unchanged };
};

// Generate month summary for reporting
export const generateMonthlySummary = (monthData: {
  purchases: any[];
  production: any[];
  indirectCosts: any[];
  schools: any[];
}): {
  totalPurchases: number;
  totalMealsProduced: number;
  totalIndirectCosts: number;
  averageCPM: number;
  schoolsServed: number;
  daysWithData: number;
} => {
  const totalPurchases = monthData.purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  const totalMealsProduced = monthData.production.reduce((sum, p) => sum + (p.mealsCalculated || 0), 0);
  const totalIndirectCosts = monthData.indirectCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
  
  const averageCPM = totalMealsProduced > 0 
    ? (totalPurchases + totalIndirectCosts) / totalMealsProduced 
    : 0;

  const schoolsServed = new Set(monthData.production.map(p => p.schoolId)).size;
  
  const daysWithData = new Set([
    ...monthData.purchases.map(p => new Date(p.purchaseDate).toDateString()),
    ...monthData.production.map(p => new Date(p.productionDate).toDateString())
  ]).size;

  return {
    totalPurchases,
    totalMealsProduced,
    totalIndirectCosts,
    averageCPM,
    schoolsServed,
    daysWithData
  };
};