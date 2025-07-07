// Weekly record management and auto-creation utilities

export interface WeekRecord {
  id: string;
  weekId: string; // Format: YYYY-WNN
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'LOCKED';
  summary: {
    totalMeals: number;
    totalIngredientCost: number;
    totalIndirectCost: number;
    averageCPM: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DailyEntry {
  id: string;
  weekId: string;
  date: string;
  purchases: any[];
  production: any[];
  calculated: {
    totalMeals: number;
    totalCost: number;
    cpm: number;
  };
}

// Generate week record from date
export const generateWeekRecord = (date: Date): WeekRecord => {
  const weekId = generateWeekId(date);
  const { year, weekNumber } = parseWeekId(weekId);
  const { startDate, endDate } = getWeekDateRange(year, weekNumber);

  return {
    id: `week_${weekId}_${Date.now()}`,
    weekId,
    year,
    weekNumber,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    status: 'ACTIVE',
    summary: {
      totalMeals: 0,
      totalIngredientCost: 0,
      totalIndirectCost: 0,
      averageCPM: 0,
      lastUpdated: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Auto-create week record when first entry is made
export const ensureWeekRecordExists = (
  date: string, 
  existingWeeks: WeekRecord[]
): WeekRecord => {
  const entryDate = new Date(date);
  const weekId = generateWeekId(entryDate);
  
  // Check if week record already exists
  let weekRecord = existingWeeks.find(week => week.weekId === weekId);
  
  if (!weekRecord) {
    // Create new week record
    weekRecord = generateWeekRecord(entryDate);
    console.log(`Auto-created week record: ${weekId}`);
  }
  
  return weekRecord;
};

// Update week summary when daily data changes
export const updateWeekSummary = (
  weekRecord: WeekRecord,
  dailyEntries: DailyEntry[],
  monthlyOverheadPerMeal: number = 0
): WeekRecord => {
  const weekEntries = dailyEntries.filter(entry => entry.weekId === weekRecord.weekId);
  
  const totalMeals = weekEntries.reduce((sum, entry) => sum + entry.calculated.totalMeals, 0);
  const totalIngredientCost = weekEntries.reduce((sum, entry) => sum + entry.calculated.totalCost, 0);
  const totalIndirectCost = totalMeals * monthlyOverheadPerMeal;
  const averageCPM = totalMeals > 0 ? (totalIngredientCost + totalIndirectCost) / totalMeals : 0;

  return {
    ...weekRecord,
    summary: {
      totalMeals,
      totalIngredientCost,
      totalIndirectCost,
      averageCPM: Math.round(averageCPM * 100) / 100,
      lastUpdated: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
};

// Recalculate monthly overhead when indirect costs change
export const recalculateMonthlyOverhead = (
  indirectCosts: any[],
  monthlyMeals: number,
  affectedWeeks: WeekRecord[]
): { overheadPerMeal: number; updatedWeeks: WeekRecord[] } => {
  const totalIndirectCosts = indirectCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const overheadPerMeal = monthlyMeals > 0 ? totalIndirectCosts / monthlyMeals : 0;

  const updatedWeeks = affectedWeeks.map(week => ({
    ...week,
    summary: {
      ...week.summary,
      totalIndirectCost: week.summary.totalMeals * overheadPerMeal,
      averageCPM: week.summary.totalMeals > 0 
        ? (week.summary.totalIngredientCost + (week.summary.totalMeals * overheadPerMeal)) / week.summary.totalMeals 
        : 0,
      lastUpdated: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));

  return {
    overheadPerMeal: Math.round(overheadPerMeal * 100) / 100,
    updatedWeeks
  };
};

// Helper functions
const generateWeekId = (date: Date): string => {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

const parseWeekId = (weekId: string): { year: number; weekNumber: number } => {
  const [yearStr, weekStr] = weekId.split('-W');
  return {
    year: parseInt(yearStr),
    weekNumber: parseInt(weekStr)
  };
};

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getWeekDateRange = (year: number, weekNumber: number): { startDate: Date; endDate: Date } => {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (weekNumber - 1) * 7 - firstDayOfYear.getDay();
  
  const startDate = new Date(year, 0, 1 + daysToAdd);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return { startDate, endDate };
};

// Lock week records to prevent further edits
export const lockWeekRecord = (weekRecord: WeekRecord): WeekRecord => {
  return {
    ...weekRecord,
    status: 'LOCKED',
    updatedAt: new Date().toISOString()
  };
};

// Check if week can be edited
export const canEditWeek = (weekRecord: WeekRecord): boolean => {
  if (weekRecord.status === 'LOCKED') return false;
  
  // Allow editing only current and previous week
  const now = new Date();
  const currentWeekId = generateWeekId(now);
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);
  const lastWeekId = generateWeekId(lastWeek);
  
  return weekRecord.weekId === currentWeekId || weekRecord.weekId === lastWeekId;
};