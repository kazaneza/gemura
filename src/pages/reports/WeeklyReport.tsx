import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { purchasesAPI, productionAPI } from '../../services/api';
import MonthSelector from '../../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../../utils/monthlySystem';
import { exportToPDF } from '../../utils/pdfExport';

interface DailyData {
  date: string;
  meals: number;
  cost: number;
}

const WeeklyReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [overheadPerMeal, setOverheadPerMeal] = useState(65.7); // Will be calculated from last month

  // Group data by service for service-based analysis
  const serviceBreakdown = {
    BREAKFAST: {
      purchases: purchases.filter(p => p.service === 'BREAKFAST'),
      productions: productions.filter(p => p.service === 'BREAKFAST'),
      totalCost: 0,
      totalMeals: 0,
      costPerMeal: 0,
      overhead: 0,
      totalCPM: 0
    },
    LUNCH: {
      purchases: purchases.filter(p => p.service === 'LUNCH'),
      productions: productions.filter(p => p.service === 'LUNCH'),
      totalCost: 0,
      totalMeals: 0,
      costPerMeal: 0,
      overhead: 0,
      totalCPM: 0
    },
    DINNER: {
      purchases: purchases.filter(p => p.service === 'DINNER'),
      productions: productions.filter(p => p.service === 'DINNER'),
      totalCost: 0,
      totalMeals: 0,
      costPerMeal: 0,
      overhead: 0,
      totalCPM: 0
    }
  };

  // Calculate metrics for each service
  Object.keys(serviceBreakdown).forEach(service => {
    const data = serviceBreakdown[service as keyof typeof serviceBreakdown];
    data.totalCost = data.purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    data.totalMeals = data.productions.reduce((sum, p) => sum + (p.patientsServed || 0), 0);
    if (data.totalMeals > 0) {
      data.costPerMeal = data.totalCost / data.totalMeals;
      data.overhead = overheadPerMeal; // Fixed overhead per meal from last month
      data.totalCPM = data.costPerMeal + data.overhead;
    }
  });

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);

  // Generate week options for the selected month
  const generateWeekOptions = () => {
    const weeks = [];
    const monthInfo = parseMonthId(selectedMonth);
    const firstDay = new Date(monthInfo.year, monthInfo.month - 1, 1);
    const lastDay = new Date(monthInfo.year, monthInfo.month, 0);
    
    let weekStart = new Date(firstDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekNumber = getWeekNumber(weekStart);
      const weekId = `${monthInfo.year}-W${weekNumber}`;
      
      weeks.push({
        id: weekId,
        weekNumber,
        label: `Week ${weekNumber} (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`,
        year: monthInfo.year,
        month: monthInfo.month,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0]
      });
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const weekOptions = generateWeekOptions();

  useEffect(() => {
    if (weekOptions.length > 0) {
      setSelectedWeek(weekOptions[0].id);
    } else {
      setSelectedWeek('');
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedWeek) {
      loadWeeklyData();
    }
    loadLastMonthOverhead();
  }, [selectedWeek]);

  const loadWeeklyData = async () => {
    if (!selectedWeek) return;
    
    try {
      setLoading(true);
      
      // Get week date range
      const selectedWeekOption = weekOptions.find(w => w.id === selectedWeek);
      if (!selectedWeekOption) return;

      const startDate = new Date(selectedWeekOption.startDate);
      const endDate = new Date(selectedWeekOption.endDate);
      endDate.setDate(endDate.getDate() + 1); // Include end date

      // Client-side aggregation - fetch raw data
      const [purchasesData, productionsData] = await Promise.all([
        purchasesAPI.getPurchases({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }),
        productionAPI.getProductions({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      ]);

      setPurchases(purchasesData);
      setProductions(productionsData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load weekly data:', err);
      setError('Failed to load weekly data');
    } finally {
      setLoading(false);
    }
  };

  // Client-side calculation using same logic as Daily Entry (pax not mealsCalculated)
  const weeklySummary = {
    totalMealsServed: productions.reduce((sum, prod) => sum + (prod.patientsServed || 0), 0),
    totalIngredientCost: purchases.reduce((sum, purchase) => sum + (purchase.totalPrice || 0), 0),
    costPerMeal: 0,
    overhead: 0,
    totalCPM: 0
  };

  if (weeklySummary.totalMealsServed > 0) {
    weeklySummary.costPerMeal = weeklySummary.totalIngredientCost / weeklySummary.totalMealsServed;
    weeklySummary.overhead = overheadPerMeal; // Fixed overhead per meal from last month
    weeklySummary.totalCPM = weeklySummary.costPerMeal + weeklySummary.overhead;
  }

  // Generate daily breakdown
  const dailyData: DailyData[] = [];
  const selectedWeekOption = weekOptions.find(w => w.id === selectedWeek);
  
  if (selectedWeekOption) {
    const startDate = new Date(selectedWeekOption.startDate);
    const endDate = new Date(selectedWeekOption.endDate);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      const dayPurchases = purchases.filter(p => 
        new Date(p.purchaseDate).toISOString().split('T')[0] === dateStr
      );
      const dayProductions = productions.filter(p => 
        new Date(p.productionDate).toISOString().split('T')[0] === dateStr
      );
      
      const dayCost = dayPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      const dayMeals = dayProductions.reduce((sum, p) => sum + (p.patientsServed || 0), 0);
      
      if (dayCost > 0 || dayMeals > 0) {
        dailyData.push({
          date: dateStr,
          meals: dayMeals,
          cost: dayCost
        });
      }
    }
  }

  // Load last month's overhead per meal
  const loadLastMonthOverhead = async () => {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Get last month's indirect costs and productions
      const [indirectCosts, productions] = await Promise.all([
        indirectCostsAPI.getIndirectCosts({
          year: lastMonth.getFullYear(),
          month: lastMonth.getMonth() + 1
        }),
        productionAPI.getProductions({
          start_date: lastMonth.toISOString(),
          end_date: lastMonthEnd.toISOString()
        })
      ]);
      
      // Calculate overhead per meal from last month
      const totalOverheadAmount = indirectCosts.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
      const totalMeals = productions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      
      console.log('WeeklyReport - Last month overhead calculation:', {
        totalOverheadAmount,
        totalMeals,
        month: lastMonth.getMonth() + 1,
        year: lastMonth.getFullYear()
      });
      
      const calculatedOverheadPerMeal = totalMeals > 0 ? totalOverheadAmount / totalMeals : 65.7;
      setOverheadPerMeal(Math.round(calculatedOverheadPerMeal * 100) / 100);
      
      console.log('WeeklyReport - Calculated overhead per meal:', calculatedOverheadPerMeal);
      
    } catch (err: any) {
      console.error('Failed to load last month overhead:', err);
      setOverheadPerMeal(65.7); // Use default if calculation fails
    }
  };

  const handleExportExcel = () => {
    console.log('Exporting to Excel...');
    alert('Excel export functionality would be implemented here');
  };

  const handleExportPDF = () => {
    const selectedWeekOption = weekOptions.find(w => w.id === selectedWeek);
    if (!selectedWeekOption) {
      alert('No week selected');
      return;
    }

    if (!selectedWeekOption) {
      alert('No week selected');
      return;
    }

    const title = `Weekly Report - ${selectedWeekOption.label}`;
    const exportData = {
      ...weeklySummary,
      serviceBreakdown,
      dailyData,
      weekInfo: selectedWeekOption
    };

    exportToPDF({
      title,
      subtitle: `${currentMonthInfo.monthName} - Generated on ${new Date().toLocaleDateString()}`,
      data: exportData,
      type: 'weekly'
    }).catch(error => {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      return;
    }

    const selectedWeekOption = weekOptions.find(w => w.id === selectedWeek);
    
    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Report - ${selectedWeekOption?.label || selectedWeek}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12pt;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .header h1 { 
              margin: 0; 
              font-size: 24pt; 
              color: #dc2626;
            }
            .header h2 { 
              margin: 10px 0 0 0; 
              font-size: 16pt; 
              color: #666;
            }
            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 20px; 
              margin: 30px 0; 
            }
            .summary-card { 
              border: 1px solid #ddd; 
              padding: 15px; 
              text-align: center;
              background: #f9f9f9;
            }
            .summary-card .value { 
              font-size: 18pt; 
              font-weight: bold; 
              color: #dc2626;
            }
            .summary-card .label { 
              font-size: 10pt; 
              color: #666; 
              margin-top: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .section { 
              margin: 30px 0; 
              page-break-inside: avoid;
            }
            .section h3 { 
              font-size: 14pt; 
              margin-bottom: 15px;
              color: #dc2626;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10pt;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GEMURA</h1>
            <h2>Weekly Report - ${selectedWeekOption?.label || selectedWeek}</h2>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="section">
            <h3>Weekly Summary</h3>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="value">${weeklySummary.totalMealsServed.toLocaleString()}</div>
                <div class="label">Total Meals</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${Math.round(weeklySummary.costPerMeal).toLocaleString()}</div>
                <div class="label">Cost/Meal</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${Math.round(weeklySummary.overhead).toLocaleString()}</div>
                <div class="label">Overhead per Meal</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${Math.round(weeklySummary.totalCPM).toLocaleString()}</div>
                <div class="label">Total CPM</div>
              </div>
            </div>
          </div>

          ${productions.length > 0 ? `
          <div class="section">
            <h3>Food Production by Hospital</h3>
            <table>
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Service</th>
                  <th>Patients Served</th>
                </tr>
              </thead>
              <tbody>
                ${productions.map((production: any) => `
                  <tr>
                    <td>${production.hospital?.name || 'Unknown Hospital'}</td>
                    <td>${production.service || 'Unknown'}</td>
                    <td>${(production.patientsServed || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td colspan="2">Total</td>
                  <td>${weeklySummary.totalMealsServed.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : '<div class="section"><h3>Food Production by Hospital</h3><p>No production data available for this week</p></div>'}

          ${dailyData.length > 0 ? `
          <div class="section">
            <h3>Daily Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meals Served</th>
                  <th>Ingredient Cost</th>
                  <th>Cost/Meal</th>
                  <th>Overhead per Meal</th>
                  <th>Total CPM</th>
                </tr>
              </thead>
              <tbody>
                ${dailyData.map(day => {
                  const costPerMeal = day.meals > 0 ? day.cost / day.meals : 0;
                  const overhead = overheadPerMeal;
                  const totalCPM = costPerMeal + overhead;
                  return `
                    <tr>
                      <td>${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td>${day.meals.toLocaleString()}</td>
                      <td>RWF ${day.cost.toLocaleString()}</td>
                      <td>RWF ${Math.round(costPerMeal).toLocaleString()}</td>
                      <td>RWF ${Math.round(overhead).toLocaleString()}</td>
                      <td>RWF ${Math.round(totalCPM).toLocaleString()}</td>
                    </tr>
                  `;
                }).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td>TOTAL</td>
                  <td>${weeklySummary.totalMealsServed.toLocaleString()}</td>
                  <td>RWF ${weeklySummary.totalIngredientCost.toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklySummary.costPerMeal).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklySummary.overhead).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklySummary.totalCPM).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : '<div class="section"><h3>Daily Breakdown</h3><p>No data available for this week</p></div>'}

          <div class="footer">
            <p>This report was generated by GEMURA - Cost Per Meal Management System</p>
            <p>Report covers ${selectedWeekOption?.label || selectedWeek} for ${currentMonthInfo.monthName}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printDocument);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  if (loading && purchases.length === 0 && productions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print-content">
      <div className="md:flex md:items-center md:justify-between no-print">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate" id="report-title">
            Weekly Report
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive weekly analysis with cost breakdown and performance metrics
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FileText className="h-4 w-4 mr-2" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 no-print">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Month Selection */}
      <div className="no-print">
        <MonthSelector
          availableMonths={availableMonths}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          showStatus={false}
        />
      </div>

      {/* Week Selection */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 no-print">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Select Week in {currentMonthInfo.monthName}</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {weekOptions.length === 0 ? (
                  <option value="">No weeks available</option>
                ) : (
                  weekOptions.map(week => (
                    <option key={week.id} value={week.id}>{week.label}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overhead per Meal</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                RWF {overheadPerMeal.toLocaleString()} (calculated from last month)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-section" id="weekly-summary">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Meals</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklySummary.totalMealsServed.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cost/Meal</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {Math.round(weeklySummary.costPerMeal).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <PieChart className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overhead ({overheadPercentage}%)</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {Math.round(weeklySummary.overhead).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total CPM</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {Math.round(weeklySummary.totalCPM).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service-Based Analysis */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="service-analysis">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Service-Based Analysis</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(serviceBreakdown).map(([service, data]) => (
              <div key={service} className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {service === 'BREAKFAST' ? '🌅 Breakfast' : 
                     service === 'LUNCH' ? '🍽️ Lunch' : 
                     '🌙 Dinner'}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{data.totalMeals.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Meals Served</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-600">RWF {Math.round(data.costPerMeal).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Cost/Meal</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-purple-600">RWF {Math.round(data.totalCPM).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Total CPM</div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Total Cost: RWF {data.totalCost.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="daily-breakdown">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Daily Breakdown</h3>
        </div>
        <div className="p-6">
          {dailyData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available for this week
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals Served</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Meal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overhead ({overheadPercentage}%)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total CPM</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyData.map((day, index) => {
                    // Get productions for this day to show service breakdown
                    const dayProductions = productions.filter(p => 
                      new Date(p.productionDate).toISOString().split('T')[0] === day.date
                    );
                    const dayPurchases = purchases.filter(p => 
                      new Date(p.purchaseDate).toISOString().split('T')[0] === day.date
                    );

                    // Group by service for this day
                    const serviceData: { [key: string]: { meals: number; cost: number } } = {};
                    
                    dayProductions.forEach(prod => {
                      const service = prod.service || 'Unknown';
                      if (!serviceData[service]) serviceData[service] = { meals: 0, cost: 0 };
                      serviceData[service].meals += prod.patientsServed || 0;
                    });
                    
                    dayPurchases.forEach(purchase => {
                      const service = purchase.service || 'Unknown';
                      if (!serviceData[service]) serviceData[service] = { meals: 0, cost: 0 };
                      serviceData[service].cost += purchase.totalPrice || 0;
                    });
                    
                    return Object.entries(serviceData).map(([service, data], serviceIndex) => {
                      const costPerMeal = data.meals > 0 ? data.cost / data.meals : 0;
                      const overhead = costPerMeal * (overheadPercentage / 100);
                      const totalCPM = costPerMeal + overhead;
                      
                      return (
                        <tr key={`${index}-${serviceIndex}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {serviceIndex === 0 ? new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {service}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.meals.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RWF {data.cost.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RWF {Math.round(costPerMeal).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RWF {Math.round(overhead).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">RWF {Math.round(totalCPM).toLocaleString()}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={2}>TOTAL</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{weeklySummary.totalMealsServed.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">RWF {weeklySummary.totalIngredientCost.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      RWF {Math.round(weeklySummary.costPerMeal).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      RWF {Math.round(weeklySummary.overhead).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                      RWF {Math.round(weeklySummary.totalCPM).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Fresh Start Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="text-blue-900 font-medium">Client-Side Aggregation</h4>
            <p className="text-blue-800 text-sm mt-1">
              This report uses real-time client-side aggregation for the fastest performance. 
              Data is calculated using the same "pax not mealsCalculated" logic as Daily Entry.
              Overhead per meal (RWF {overheadPerMeal}) is calculated from last month's data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;