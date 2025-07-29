import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3,
  Calculator
} from 'lucide-react';
import { purchasesAPI, productionAPI, indirectCostsAPI } from '../services/api';

interface DashboardData {
  lastMonthCPM: number;
  lastWeekCPM: number;
  todayCPM: number;
  lastMonthMeals: number;
  lastWeekMeals: number;
  todayMeals: number;
}

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    lastMonthCPM: 0,
    lastWeekCPM: 0,
    todayCPM: 0,
    lastMonthMeals: 0,
    lastWeekMeals: 0,
    todayMeals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overheadPerMeal, setOverheadPerMeal] = useState(65.7); // Will be calculated from last month
  const [sevenDayTrend, setSevenDayTrend] = useState<Array<{date: string, meals: number}>>([]);
  const [monthlyCPMTrend, setMonthlyCPMTrend] = useState<Array<{week: string, cpm: number}>>([]);

  useEffect(() => {
    loadDashboardData();
    loadChartData();
  }, []);

  // Calculate service-based CPM like in Reports
  const calculateServiceBasedCPM = (purchases: any[], productions: any[], overheadPerMeal: number) => {
    const services = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const serviceCPMs: number[] = [];
    
    services.forEach(service => {
      const servicePurchases = purchases.filter((p: any) => p.service === service);
      const serviceProductions = productions.filter((p: any) => p.service === service);
      
      const totalMeals = serviceProductions.reduce((sum: number, p: any) => sum + (p.patientsServed || 0), 0);
      const totalIngredientCost = servicePurchases.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0);
      
      // EXACT same calculation as Reports table shows for each service
      const serviceCPM = totalMeals > 0 ? ((totalIngredientCost + (totalMeals * overheadPerMeal)) / totalMeals) : 0;
      serviceCPMs.push(serviceCPM);
    });
    
    // Sum all service CPMs and divide by 3 (same as Reports Average)
    const sum = serviceCPMs.reduce((total, cpm) => total + cpm, 0);
    const average = sum / 3;
    
    return Math.round(average);
  };

  // Load last month's overhead per meal
  const loadLastMonthOverhead = async () => {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      
      // Get last month's indirect costs (which are now per meal amounts)
      const indirectCosts = await indirectCostsAPI.getIndirectCosts({
        year: lastMonth.getFullYear(),
        month: lastMonth.getMonth() + 1
      });
      
      // Sum up overhead per meal amounts from last month
      const totalOverheadPerMeal = indirectCosts.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
      
      setOverheadPerMeal(Math.round(totalOverheadPerMeal * 100) / 100);
    } catch (err: any) {
      setOverheadPerMeal(0); // Use 0 if calculation fails
    }
  };

  const loadChartData = async () => {
    try {
      // Load 7-day meal trend
      const sevenDayData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);
        
        const dayProductions = await productionAPI.getProductions({
          start_date: dateStart.toISOString(),
          end_date: dateEnd.toISOString()
        });
        
        const dayMeals = dayProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
        
        sevenDayData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          meals: dayMeals
        });
      }
      
      setSevenDayTrend(sevenDayData);
      
      // Load 5-week CPM trend
      const fiveWeekData = [];
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
      
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const [weekPurchases, weekProductions] = await Promise.all([
          purchasesAPI.getPurchases({
            start_date: weekStart.toISOString(),
            end_date: weekEnd.toISOString()
          }),
          productionAPI.getProductions({
            start_date: weekStart.toISOString(),
            end_date: weekEnd.toISOString()
          })
        ]);
        
        const weekCPM = calculateServiceBasedCPM(weekPurchases, weekProductions, overheadPerMeal);
        
        const weekLabel = i === 0 ? 'Current' : `W${5-i}`;
        fiveWeekData.push({
          week: weekLabel,
          cpm: weekCPM
        });
      }
      
      setMonthlyCPMTrend(fiveWeekData);
      
    } catch (err: any) {
      // Keep empty arrays if loading fails
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get date ranges
      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Last week start and end
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() - 6); // Last Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Last Sunday
      
      // Last month start and end
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Load overhead per meal from last month FIRST
      const lastMonthForOverhead = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const indirectCosts = await indirectCostsAPI.getIndirectCosts({
        year: lastMonthForOverhead.getFullYear(),
        month: lastMonthForOverhead.getMonth() + 1
      });
      
      // Calculate overhead per meal from last month
      const newOverheadPerMeal = indirectCosts.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
      setOverheadPerMeal(newOverheadPerMeal);

      // Fetch data for all periods
      const [
        todayPurchases,
        todayProductions,
        lastWeekPurchases,
        lastWeekProductions,
        lastMonthPurchases,
        lastMonthProductions,
      ] = await Promise.all([
        // Today data
        purchasesAPI.getPurchases({
          start_date: todayStart.toISOString(),
          end_date: todayEnd.toISOString()
        }),
        productionAPI.getProductions({
          start_date: todayStart.toISOString(),
          end_date: todayEnd.toISOString()
        }),
        // Last week data
        purchasesAPI.getPurchases({
          start_date: weekStart.toISOString(),
          end_date: weekEnd.toISOString()
        }),
        productionAPI.getProductions({
          start_date: weekStart.toISOString(),
          end_date: weekEnd.toISOString()
        }),
        // Last month data
        purchasesAPI.getPurchases({
          start_date: lastMonth.toISOString(),
          end_date: lastMonthEnd.toISOString()
        }),
        productionAPI.getProductions({
          start_date: lastMonth.toISOString(),
          end_date: lastMonthEnd.toISOString()
        })
      ]);

      // Calculate CPMs using service-based approach like Reports
      const todayMeals = todayProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const todayCPM = calculateServiceBasedCPM(todayPurchases, todayProductions, newOverheadPerMeal);
      
      const lastWeekMeals = lastWeekProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const lastWeekCPM = calculateServiceBasedCPM(lastWeekPurchases, lastWeekProductions, newOverheadPerMeal);
      
      const lastMonthTotalMeals = lastMonthProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const lastMonthCPM = calculateServiceBasedCPM(lastMonthPurchases, lastMonthProductions, newOverheadPerMeal);

      setDashboardData({
        lastMonthCPM: lastMonthCPM,
        lastWeekCPM: lastWeekCPM,
        todayCPM: todayCPM,
        lastMonthMeals: lastMonthTotalMeals,
        lastWeekMeals: lastWeekMeals,
        todayMeals,
      });

      setError(null);
    } catch (err: any) {
      setError('Failed to load dashboard data');
      // Keep default values (zeros) if API fails
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your kitchen operations.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            {error}. Showing default values.
          </div>
        </div>
      )}

      {/* Key Metrics Cards - Last Month, Last Week, Today */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last Month CPM</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      RWF {Math.round(dashboardData.lastMonthCPM).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.lastMonthMeals.toLocaleString()} meals
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last Week CPM</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      RWF {Math.round(dashboardData.lastWeekCPM).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.lastWeekMeals.toLocaleString()} meals
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today CPM</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      RWF {Math.round(dashboardData.todayCPM).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.todayMeals.toLocaleString()} meals
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 7-Day Meal Trend */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">7-Day Meal Trend</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {sevenDayTrend.map((day, index) => {
                const maxMeals = Math.max(...sevenDayTrend.map(d => d.meals), 1);
                const heightPercentage = (day.meals / maxMeals) * 80 + 20;
                
                return (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{day.date}</div>
                  <div className="bg-red-100 rounded h-16 flex items-end justify-center">
                    <div 
                      className="bg-red-600 rounded-sm w-full"
                      style={{ height: `${heightPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-700 mt-1">
                    {day.meals.toLocaleString()}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly CPM Trend */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly CPM Trend</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-3">
              {monthlyCPMTrend.map((week, index) => {
                const maxCPM = Math.max(...monthlyCPMTrend.map(w => w.cpm), 1);
                const heightPercentage = (week.cpm / maxCPM) * 70 + 30;
                
                return (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{week.week}</div>
                  <div className="bg-blue-100 rounded h-20 flex items-end justify-center">
                    <div 
                      className="bg-blue-600 rounded-sm w-full"
                      style={{ height: `${heightPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-700 mt-1">
                    RWF {Math.round(week.cpm).toLocaleString()}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;