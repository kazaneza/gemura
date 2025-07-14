import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Factory, 
  FileText, 
  Users, 
  Calendar,
  BarChart3,
  Calculator
} from 'lucide-react';
import { purchasesAPI, productionAPI, hospitalsAPI } from '../services/api';

interface DashboardData {
  lastWeekCPM: number;
  currentWeekCPM: number;
  todayCPM: number;
  todayMeals: number;
  hospitalsContribution: Array<{
    name: string;
    meals: number;
    percentage: number;
  }>;
  sevenDayTrend: Array<{
    date: string;
    meals: number;
  }>;
  monthCPMTrend: Array<{
    week: string;
    cpm: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    lastWeekCPM: 0,
    currentWeekCPM: 0,
    todayCPM: 0,
    todayMeals: 0,
    hospitalsContribution: [],
    sevenDayTrend: [],
    monthCPMTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overheadPercentage] = useState(15); // Default overhead percentage

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
      
      // Current week start (Monday)
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      
      // Last week start and end
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(weekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekStart);
      lastWeekEnd.setDate(weekStart.getDate() - 1);
      
      // 7 days ago
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Client-side aggregation - fetch raw data
      const [
        todayPurchases,
        todayProductions,
        lastWeekPurchases,
        lastWeekProductions,
        weekPurchases,
        weekProductions,
        sevenDayPurchases,
        sevenDayProductions,
        hospitals
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
          start_date: lastWeekStart.toISOString(),
          end_date: lastWeekEnd.toISOString()
        }),
        productionAPI.getProductions({
          start_date: lastWeekStart.toISOString(),
          end_date: lastWeekEnd.toISOString()
        }),
        // Current week data
        purchasesAPI.getPurchases({
          start_date: weekStart.toISOString(),
          end_date: today.toISOString()
        }),
        productionAPI.getProductions({
          start_date: weekStart.toISOString(),
          end_date: today.toISOString()
        }),
        // 7-day data
        purchasesAPI.getPurchases({
          start_date: sevenDaysAgo.toISOString(),
          end_date: today.toISOString()
        }),
        productionAPI.getProductions({
          start_date: sevenDaysAgo.toISOString(),
          end_date: today.toISOString()
        }),
        // Hospitals for contribution calculation
        hospitalsAPI.getHospitals()
      ]);

      // Calculate metrics using same logic as Daily Entry (pax not mealsCalculated)
      
      // Today's meals and CPM
      const todayMeals = todayProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const todayIngredientCost = todayPurchases.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
      const todayCostPerMeal = todayMeals > 0 ? todayIngredientCost / todayMeals : 0;
      const todayOverhead = 50; // Fixed RWF 50 per meal overhead
      const todayCPM = todayCostPerMeal + todayOverhead;
      
      // Last week CPM
      const lastWeekMeals = lastWeekProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const lastWeekIngredientCost = lastWeekPurchases.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
      const lastWeekCostPerMeal = lastWeekMeals > 0 ? lastWeekIngredientCost / lastWeekMeals : 0;
      const lastWeekOverhead = 50; // Fixed RWF 50 per meal overhead
      const lastWeekCPM = lastWeekCostPerMeal + lastWeekOverhead;
      
      // Current week CPM
      const weekMeals = weekProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      const weekIngredientCost = weekPurchases.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
      const weekCostPerMeal = weekMeals > 0 ? weekIngredientCost / weekMeals : 0;
      const weekOverhead = 50; // Fixed RWF 50 per meal overhead
      const currentWeekCPM = weekCostPerMeal + weekOverhead;

      // Today's hospital contribution
      const hospitalsContribution: Array<{ name: string; meals: number; percentage: number }> = [];
      if (todayMeals > 0) {
        const hospitalMeals: { [key: string]: { meals: number; hospital: any } } = {};
        
        todayProductions.forEach((production: any) => {
          const hospitalId = production.hospitalId;
          if (!hospitalMeals[hospitalId]) {
            hospitalMeals[hospitalId] = {
              meals: 0,
              hospital: hospitals.find((h: any) => h.id === hospitalId)
            };
          }
          hospitalMeals[hospitalId].meals += production.patientsServed || 0;
        });
        
        Object.values(hospitalMeals).forEach(({ meals, hospital }) => {
          if (hospital && meals > 0) {
            const percentage = (meals / todayMeals) * 100;
            hospitalsContribution.push({
              name: hospital.name,
              meals,
              percentage: Math.round(percentage * 10) / 10
            });
          }
        });
        
        hospitalsContribution.sort((a, b) => b.meals - a.meals);
      }

      // 7-day trend
      const sevenDayTrend: Array<{ date: string; meals: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayProductions = sevenDayProductions.filter((prod: any) => 
          new Date(prod.productionDate).toISOString().split('T')[0] === dateStr
        );
        const dayMeals = dayProductions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
        
        sevenDayTrend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          meals: dayMeals
        });
      }

      // Monthly CPM trend (last 4 weeks + current)
      const monthCPMTrend: Array<{ week: string; cpm: number }> = [];
      for (let i = 4; i >= 0; i--) {
        const weekStartTrend = new Date(weekStart);
        weekStartTrend.setDate(weekStart.getDate() - (i * 7));
        const weekEndTrend = new Date(weekStartTrend);
        weekEndTrend.setDate(weekStartTrend.getDate() + 6);
        
        const weekProductionsTrend = sevenDayProductions.filter((prod: any) => {
          const prodDate = new Date(prod.productionDate);
          return prodDate >= weekStartTrend && prodDate <= weekEndTrend;
        });
        const weekPurchasesTrend = sevenDayPurchases.filter((purchase: any) => {
          const purchaseDate = new Date(purchase.purchaseDate);
          return purchaseDate >= weekStartTrend && purchaseDate <= weekEndTrend;
        });
        
        const weekCostTrend = weekPurchasesTrend.reduce((sum: number, purchase: any) => sum + (purchase.totalPrice || 0), 0);
        const weekMealsTrend = weekProductionsTrend.reduce((sum: number, prod: any) => sum + (prod.beneficiariesServed || 0), 0);
        
        const weekCPMTrend = weekMealsTrend > 0 ? 
          (weekCostTrend / weekMealsTrend) * (1 + overheadPercentage / 100) : 0;
        
        const weekLabel = i === 0 ? 'Current' : `W${5-i}`;
        monthCPMTrend.push({
          week: weekLabel,
          cpm: Math.round(weekCPMTrend)
        });
      }

      setDashboardData({
        lastWeekCPM: Math.round(lastWeekCPM),
        currentWeekCPM: Math.round(currentWeekCPM),
        todayCPM: Math.round(todayCPM),
        todayMeals,
        hospitalsContribution,
        sevenDayTrend,
        monthCPMTrend
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

      {/* Key Metrics Cards - Using Real Calculations */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last Week CPM</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      RWF {dashboardData.lastWeekCPM.toLocaleString()}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Week CPM</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      RWF {dashboardData.currentWeekCPM.toLocaleString()}
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
                  <Calculator className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today CPM</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      RWF {dashboardData.todayCPM.toLocaleString()}
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
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Meals for Today</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900">
                      {dashboardData.todayMeals.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/daily"
              className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 group"
            >
              <Calendar className="h-5 w-5 mr-3 group-hover:text-red-600" />
              Enter Today's Data
            </Link>
            
            <Link
              to="/reports/daily"
              className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 group"
            >
              <FileText className="h-5 w-5 mr-3 group-hover:text-red-600" />
              View Daily Report
            </Link>
            
            <Link
              to="/reports/weekly"
              className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 group"
            >
              <FileText className="h-5 w-5 mr-3 group-hover:text-red-600" />
              View This Week's Report
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Meals Trend */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">7-Day Meals Trend</h3>
          </div>
          <div className="p-6">
            {dashboardData.sevenDayTrend.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No data available
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.sevenDayTrend.map((day, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-12 text-xs text-gray-600">{day.date}</div>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${dashboardData.sevenDayTrend.length > 0 
                              ? (day.meals / Math.max(...dashboardData.sevenDayTrend.map(d => d.meals))) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-xs text-gray-900 text-right font-medium">
                      {day.meals}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current Month CPM Trend */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Monthly CPM Trend</h3>
          </div>
          <div className="p-6">
            {dashboardData.monthCPMTrend.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No data available
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.monthCPMTrend.map((week, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-16 text-xs text-gray-600">{week.week}</div>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            week.week === 'Current' ? 'bg-red-600' : 'bg-green-600'
                          }`}
                          style={{ 
                            width: `${dashboardData.monthCPMTrend.length > 0 
                              ? (week.cpm / Math.max(...dashboardData.monthCPMTrend.map(w => w.cpm))) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-900 text-right font-medium">
                      {week.cpm}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hospitals Contribution Today */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Today's Hospital Contribution</h3>
          </div>
          <div className="p-6">
            {dashboardData.hospitalsContribution.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No data available
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.hospitalsContribution.map((hospital, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{hospital.name}</span>
                        <span className="text-sm text-gray-500">{hospital.meals}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${hospital.percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{hospital.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client-side aggregation info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="text-blue-900 font-medium">Real-Time Dashboard</h4>
            <p className="text-blue-800 text-sm mt-1">
              Showing the 4 key metrics: Last Week CPM, Current Week CPM, Today CPM, and Total Meals for Today. 
              All calculations use real-time data with {overheadPercentage}% overhead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;