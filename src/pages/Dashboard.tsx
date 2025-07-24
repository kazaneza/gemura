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

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      

      // Fetch data for all periods
      const [
        todayPurchases,
        todayProductions,
        lastWeekPurchases,
        lastWeekProductions,
        lastMonthPurchases,
        lastMonthProductions,
        lastMonthIndirectCosts
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
        }),
        // Last month indirect costs
        indirectCostsAPI.getIndirectCosts({
          year: lastMonth.getFullYear(),
          month: lastMonth.getMonth() + 1
        })
      ]);

      // Calculate last month overhead per meal
      const lastMonthTotalOverhead = lastMonthIndirectCosts.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
      const lastMonthTotalMeals = lastMonthProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const calculatedOverheadPerMeal = lastMonthTotalMeals > 0 ? lastMonthTotalOverhead / lastMonthTotalMeals : 0;
      setOverheadPerMeal(Math.round(calculatedOverheadPerMeal * 100) / 100);
      
      // Today's meals and CPM
      const todayMeals = todayProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const todayIngredientCost = todayPurchases.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
      const todayCostPerMeal = todayMeals > 0 ? todayIngredientCost / todayMeals : 0;
      const todayOverhead = calculatedOverheadPerMeal;
      const todayCPM = todayCostPerMeal + todayOverhead;
      
      // Last week CPM
      const lastWeekMeals = lastWeekProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const lastWeekIngredientCost = lastWeekPurchases.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
      const lastWeekCostPerMeal = lastWeekMeals > 0 ? lastWeekIngredientCost / lastWeekMeals : 0;
      const lastWeekOverhead = calculatedOverheadPerMeal;
      const lastWeekCPM = lastWeekCostPerMeal + lastWeekOverhead;
      
      // Last month CPM
      const lastMonthIngredientCost = lastMonthPurchases.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
      const lastMonthCostPerMeal = lastMonthTotalMeals > 0 ? lastMonthIngredientCost / lastMonthTotalMeals : 0;
      const lastMonthCPM = lastMonthCostPerMeal + calculatedOverheadPerMeal;

      setDashboardData({
        lastMonthCPM: Math.round(lastMonthCPM),
        lastWeekCPM: Math.round(lastWeekCPM),
        todayCPM: Math.round(todayCPM),
        lastMonthMeals: lastMonthTotalMeals,
        lastWeekMeals: lastWeekMeals,
        todayMeals,
      });

      setError(null);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
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
                      RWF {dashboardData.lastMonthCPM.toLocaleString()}
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
                      RWF {dashboardData.lastWeekCPM.toLocaleString()}
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
                      RWF {dashboardData.todayCPM.toLocaleString()}
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

    </div>
  );
};

export default Dashboard;