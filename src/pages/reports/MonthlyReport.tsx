import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { purchasesAPI, productionAPI, indirectCostsAPI } from '../../services/api';
import MonthSelector from '../../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../../utils/monthlySystem';
import { exportToPDF } from '../../utils/pdfExport';

interface WeeklyData {
  weekNumber: number;
  weekLabel: string;
  mealsServed: number;
  ingredientCost: number;
  costPerMeal: number;
  overheadPerMeal: number;
  totalCPM: number;
}

interface IndirectCostBreakdown {
  totalAmount: number;
  totalMeals: number;
  costPerMeal: number;
  details: Array<{
    code: string;
    category: string;
    description: string;
    amount: number;
    percentage: number;
  }>;
}

const MonthlyReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [indirectCostsBreakdown, setIndirectCostsBreakdown] = useState<IndirectCostBreakdown>({
    totalAmount: 0,
    totalMeals: 0,
    costPerMeal: 0,
    details: []
  });
  const [overheadPerMeal] = useState(65.7); // Fixed overhead per meal from last month

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      const monthInfo = parseMonthId(selectedMonth);
      
      // Get month date range
      const startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
      const endDate = new Date(monthInfo.year, monthInfo.month, 0);
      endDate.setDate(endDate.getDate() + 1);

      // Fetch all data for the month
      const [purchases, productions, indirectCosts] = await Promise.all([
        purchasesAPI.getPurchases({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }),
        productionAPI.getProductions({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }),
        indirectCostsAPI.getIndirectCosts({
          year: monthInfo.year,
          month: monthInfo.month
        })
      ]);

      // Calculate weekly breakdown
      const weeks: WeeklyData[] = [];
      const firstDay = new Date(monthInfo.year, monthInfo.month - 1, 1);
      const lastDay = new Date(monthInfo.year, monthInfo.month, 0);
      
      let weekStart = new Date(firstDay);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      while (weekStart <= lastDay) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekNumber = getWeekNumber(weekStart);
        
        // Filter data for this week
        const weekPurchases = purchases.filter((p: any) => {
          const purchaseDate = new Date(p.purchaseDate);
          return purchaseDate >= weekStart && purchaseDate <= weekEnd;
        });
        
        const weekProductions = productions.filter((p: any) => {
          const productionDate = new Date(p.productionDate);
          return productionDate >= weekStart && productionDate <= weekEnd;
        });
        
        const weekIngredientCost = weekPurchases.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0);
        const weekMeals = weekProductions.reduce((sum: number, p: any) => sum + (p.patientsServed || 0), 0);
        
        const weekOverheadCost = weekMeals * overheadPerMeal;
        const weekCostPerMeal = weekMeals > 0 ? (weekIngredientCost + weekOverheadCost) / weekMeals : 0;
        
        if (weekMeals > 0 || weekIngredientCost > 0) {
          weeks.push({
            weekNumber,
            weekLabel: `Week ${weekNumber}`,
            mealsServed: weekMeals,
            ingredientCost: weekIngredientCost,
            costPerMeal: weekCostPerMeal,
            overheadPerMeal,
            totalCPM: weekCostPerMeal // Same as costPerMeal since overhead is included
          });
        }
        
        weekStart.setDate(weekStart.getDate() + 7);
      }

      setWeeklyData(weeks);

      // Calculate indirect costs breakdown
      const totalIndirectAmount = indirectCosts.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const totalMeals = productions.reduce((sum: number, p: any) => sum + (p.patientsServed || 0), 0);
      const indirectCostPerMeal = totalMeals > 0 ? totalIndirectAmount / totalMeals : 0;

      // Group indirect costs by category
      const costGroups: { [key: string]: { code: string; category: string; description: string; amount: number } } = {};
      
      indirectCosts.forEach((cost: any) => {
        const key = `${cost.code || ''}_${cost.category}`;
        if (!costGroups[key]) {
          costGroups[key] = {
            code: cost.code || '',
            category: cost.category,
            description: cost.description,
            amount: 0
          };
        }
        costGroups[key].amount += cost.amount;
      });

      const details = Object.values(costGroups).map(group => ({
        ...group,
        percentage: totalIndirectAmount > 0 ? Math.round((group.amount / totalIndirectAmount) * 100 * 10) / 10 : 0
      })).sort((a, b) => b.amount - a.amount);

      setIndirectCostsBreakdown({
        totalAmount: totalIndirectAmount,
        totalMeals,
        costPerMeal: indirectCostPerMeal,
        details
      });

      setError(null);
    } catch (err: any) {
      console.error('Failed to load monthly data:', err);
      setError('Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Calculate monthly totals
  const monthlyTotals = {
    totalMealsServed: weeklyData.reduce((sum, week) => sum + week.mealsServed, 0),
    totalIngredientCosts: weeklyData.reduce((sum, week) => sum + week.ingredientCost, 0),
    totalIndirectCosts: indirectCostsBreakdown.totalAmount,
    averageCPM: 0,
    totalCPM: 0
  };

  if (monthlyTotals.totalMealsServed > 0) {
    const totalOverheadCosts = monthlyTotals.totalMealsServed * overheadPerMeal;
    monthlyTotals.averageCPM = (monthlyTotals.totalIngredientCosts + totalOverheadCosts) / monthlyTotals.totalMealsServed;
    monthlyTotals.totalCPM = monthlyTotals.averageCPM; // Same as averageCPM since overhead is included
  }

  const handleExportPDF = () => {
    const exportData = {
      weeklyBreakdown: weeklyData,
      monthlyTotals,
      indirectCostsBreakdown,
      overheadPerMeal
    };

    exportToPDF({
      title: `Monthly Report - ${currentMonthInfo.monthName}`,
      subtitle: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      data: exportData,
      type: 'monthly'
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

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Report - ${currentMonthInfo.monthName}</title>
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
            <h2>Monthly Report - ${currentMonthInfo.monthName}</h2>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="section">
            <h3>Monthly Summary</h3>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="value">${monthlyTotals.totalMealsServed.toLocaleString()}</div>
                <div class="label">Total Meals</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${Math.round(monthlyTotals.averageCPM).toLocaleString()}</div>
                <div class="label">Avg Cost/Meal</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${overheadPerMeal.toLocaleString()}</div>
                <div class="label">Overhead/Meal</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${Math.round(monthlyTotals.totalCPM).toLocaleString()}</div>
                <div class="label">Total CPM</div>
              </div>
            </div>
          </div>

          ${weeklyData.length > 0 ? `
          <div class="section">
            <h3>Weekly Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Meals</th>
                  <th>Ingredients</th>
                  <th>Cost/Meal</th>
                  <th>Overhead/Meal</th>
                  <th>Total CPM</th>
                </tr>
              </thead>
              <tbody>
                ${weeklyData.map(week => `
                  <tr>
                    <td>${week.weekLabel}</td>
                    <td>${week.mealsServed.toLocaleString()}</td>
                    <td>RWF ${week.ingredientCost.toLocaleString()}</td>
                    <td>RWF ${Math.round(week.costPerMeal).toLocaleString()}</td>
                    <td>RWF ${Math.round(week.overheadPerMeal).toLocaleString()}</td>
                    <td>RWF ${Math.round(week.totalCPM).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td>TOTAL</td>
                  <td>${monthlyTotals.totalMealsServed.toLocaleString()}</td>
                  <td>RWF ${monthlyTotals.totalIngredientCosts.toLocaleString()}</td>
                  <td>RWF ${Math.round(monthlyTotals.averageCPM).toLocaleString()}</td>
                  <td>RWF ${overheadPerMeal.toLocaleString()}</td>
                  <td>RWF ${Math.round(monthlyTotals.totalCPM).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : '<div class="section"><h3>Weekly Breakdown</h3><p>No data available for this month</p></div>'}

          <div class="footer">
            <p>This report was generated by GEMURA - Cost Per Meal Management System</p>
            <p>Monthly Report for ${currentMonthInfo.monthName}</p>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print-content">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between no-print">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Monthly Report - {currentMonthInfo.monthName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive monthly analysis with weekly breakdown and cost analysis
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => alert('Excel export functionality would be implemented here')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
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

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-section" id="monthly-summary">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Meals</p>
              <p className="text-2xl font-semibold text-gray-900">{monthlyTotals.totalMealsServed.toLocaleString()}</p>
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
              <p className="text-sm font-medium text-gray-500">Avg Cost/Meal</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {Math.round(monthlyTotals.averageCPM).toLocaleString()}</p>
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
              <p className="text-sm font-medium text-gray-500">Overhead per Meal</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {overheadPerMeal.toLocaleString()}</p>
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
              <p className="text-2xl font-semibold text-gray-900">RWF {Math.round(monthlyTotals.totalCPM).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="weekly-breakdown">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Weekly Breakdown</h3>
        </div>
        <div className="p-6">
          {weeklyData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available for this month
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Meals</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Meal</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overhead/Meal</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total CPM</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklyData.map((week, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {week.weekLabel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {week.mealsServed.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        RWF {week.ingredientCost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        RWF {Math.round(week.costPerMeal).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        RWF {Math.round(week.overheadPerMeal).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                        RWF {Math.round(week.totalCPM).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      {monthlyTotals.totalMealsServed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      RWF {monthlyTotals.totalIngredientCosts.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      RWF {Math.round(monthlyTotals.averageCPM).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      RWF {overheadPerMeal.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">
                      RWF {Math.round(monthlyTotals.totalCPM).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Overheads Breakdown */}
      {indirectCostsBreakdown.details.length > 0 && (
        <div className="bg-white border rounded-lg print-section" id="overheads">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Overheads</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Code</th>
                    <th className="text-left py-3 px-4 font-medium">Overheads</th>
                    <th className="text-right py-3 px-4 font-medium">Overheads RWF</th>
                    <th className="text-right py-3 px-4 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {indirectCostsBreakdown.details.map((cost: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{cost.code || ''}</td>
                      <td className="py-3 px-4">{cost.category}</td>
                      <td className="py-3 px-4 text-right">{cost.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{cost.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="py-3 px-4" colSpan={2}>Total Overhead Production costs</td>
                    <td className="py-3 px-4 text-right">{indirectCostsBreakdown.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Overhead Cost per Meal Calculation */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-blue-600 font-medium mb-2">Overhead Cost per Meal</div>
                <div className="text-3xl font-bold text-blue-900 mb-2">
                  RWF {Math.round(indirectCostsBreakdown.costPerMeal).toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">
                  RWF {indirectCostsBreakdown.totalAmount.toLocaleString()} ÷ {indirectCostsBreakdown.totalMeals.toLocaleString()} meals
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client-side aggregation info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="text-blue-900 font-medium">Client-Side Aggregation</h4>
            <p className="text-blue-800 text-sm mt-1">
              This report uses real-time client-side aggregation. Weekly calculations: Cost/Meal (ingredients only) + Overhead (RWF {overheadPerMeal} per meal from last month) = Total CPM. 
              Totals and averages are calculated correctly from weekly data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;