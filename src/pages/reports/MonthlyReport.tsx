import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer } from 'lucide-react';
import { purchasesAPI, productionAPI, indirectCostsAPI } from '../../services/api';
import MonthSelector from '../../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../../utils/monthlySystem';

const MonthlyReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [indirectCosts, setIndirectCosts] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);

  // Service-based analysis
  const serviceBreakdown = {
    BREAKFAST: {
      purchases: purchases.filter(p => p.service === 'BREAKFAST'),
      productions: productions.filter(p => p.service === 'BREAKFAST'),
      totalCost: 0,
      totalMeals: 0,
      costPerMeal: 0,
      overheadPerMeal: 0,
      totalCPM: 0
    },
    LUNCH: {
      purchases: purchases.filter(p => p.service === 'LUNCH'),
      productions: productions.filter(p => p.service === 'LUNCH'),
      totalCost: 0,
      totalMeals: 0,
      costPerMeal: 0,
      overheadPerMeal: 0,
      totalCPM: 0
    },
    DINNER: {
      purchases: purchases.filter(p => p.service === 'DINNER'),
      productions: productions.filter(p => p.service === 'DINNER'),
      totalCost: 0,
      totalMeals: 0,
      costPerMeal: 0,
      overheadPerMeal: 0,
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
      data.overheadPerMeal = monthlyTotals.overheadPerMeal;
      data.totalCPM = data.costPerMeal + data.overheadPerMeal;
    }
  });
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
      endDate.setDate(endDate.getDate() + 1); // Include end date

      // Client-side aggregation - fetch raw data
      const [purchasesData, productionsData, indirectCostsData] = await Promise.all([
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

      setPurchases(purchasesData);
      setProductions(productionsData);
      setIndirectCosts(indirectCostsData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load monthly data:', err);
      setError('Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  };

  // Client-side calculation using same logic as Daily Entry (pax not mealsCalculated)
  const monthlyTotals = {
    totalMealsServed: productions.reduce((sum, prod) => sum + (prod.patientsServed || 0), 0),
    totalIngredientCosts: purchases.reduce((sum, purchase) => sum + (purchase.totalPrice || 0), 0),
    totalIndirectCosts: indirectCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0),
    costPerMeal: 0,
    overheadPerMeal: 0,
    totalCPM: 0
  };

  if (monthlyTotals.totalMealsServed > 0) {
    monthlyTotals.costPerMeal = monthlyTotals.totalIngredientCosts / monthlyTotals.totalMealsServed;
    monthlyTotals.overheadPerMeal = monthlyTotals.totalIndirectCosts / monthlyTotals.totalMealsServed;
    monthlyTotals.totalCPM = monthlyTotals.costPerMeal + monthlyTotals.overheadPerMeal;
  }

  // Generate weekly breakdown with correct calculations
  const generateWeeklyBreakdown = () => {
    const weeks: any[] = [];
    const monthInfo = parseMonthId(selectedMonth);
    const firstDay = new Date(monthInfo.year, monthInfo.month - 1, 1);
    const lastDay = new Date(monthInfo.year, monthInfo.month, 0);
    
    let weekStart = new Date(firstDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekNumber = getWeekNumber(weekStart);
      
      // Filter data for this week
      const weekPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.purchaseDate);
        return purchaseDate >= weekStart && purchaseDate <= weekEnd;
      });
      
      const weekProductions = productions.filter(p => {
        const productionDate = new Date(p.productionDate);
        return productionDate >= weekStart && productionDate <= weekEnd;
      });
      
      const weekMeals = weekProductions.reduce((sum, p) => sum + (p.beneficiaries || 0), 0);
      const weekIngredientCost = weekPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      
      // Calculate weekly cost per meal (ingredients only)
      const weekCostPerMeal = weekMeals > 0 ? weekIngredientCost / weekMeals : 0;
      
      // Add indirect cost per meal to each week (monthly overhead distributed)
      const weekOverheadPerMeal = monthlyTotals.overheadPerMeal;
      
      // Total CPM = Weekly Cost per Meal + Indirect Cost per Meal
      const weekTotalCPM = weekCostPerMeal + weekOverheadPerMeal;
      
      if (weekMeals > 0 || weekIngredientCost > 0) {
        weeks.push({
          weekNumber,
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          mealsServed: weekMeals,
          ingredientCost: weekIngredientCost,
          costPerMeal: weekCostPerMeal,
          overheadPerMeal: weekOverheadPerMeal,
          totalCPM: weekTotalCPM
        });
      }
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const weeklyBreakdown = generateWeeklyBreakdown();

  // Calculate totals and averages for weekly breakdown
  const weeklyTotals = {
    totalMeals: weeklyBreakdown.reduce((sum, week) => sum + week.mealsServed, 0),
    totalIngredientCost: weeklyBreakdown.reduce((sum, week) => sum + week.ingredientCost, 0),
    totalCostPerMeal: weeklyBreakdown.reduce((sum, week) => sum + (week.costPerMeal * week.mealsServed), 0),
    totalOverhead: weeklyBreakdown.reduce((sum, week) => sum + (week.overheadPerMeal * week.mealsServed), 0),
    totalCPM: weeklyBreakdown.reduce((sum, week) => sum + (week.totalCPM * week.mealsServed), 0)
  };

  const weeklyAverages = {
    avgMeals: weeklyBreakdown.length > 0 ? weeklyTotals.totalMeals / weeklyBreakdown.length : 0,
    avgIngredientCost: weeklyBreakdown.length > 0 ? weeklyTotals.totalIngredientCost / weeklyBreakdown.length : 0,
    avgCostPerMeal: weeklyTotals.totalMeals > 0 ? weeklyTotals.totalCostPerMeal / weeklyTotals.totalMeals : 0,
    avgOverheadPerMeal: weeklyTotals.totalMeals > 0 ? weeklyTotals.totalOverhead / weeklyTotals.totalMeals : 0,
    avgTotalCPM: weeklyTotals.totalMeals > 0 ? weeklyTotals.totalCPM / weeklyTotals.totalMeals : 0
  };

  // Generate indirect costs breakdown
  const indirectCostsBreakdown = {
    totalAmount: monthlyTotals.totalIndirectCosts,
    totalMeals: monthlyTotals.totalMealsServed,
    costPerMeal: monthlyTotals.overheadPerMeal,
    details: indirectCosts.map(cost => ({
      code: cost.code || '',
      category: cost.category,
      description: cost.description,
      amount: cost.amount,
      percentage: monthlyTotals.totalIndirectCosts > 0 
        ? Math.round((cost.amount / monthlyTotals.totalIndirectCosts) * 100 * 10) / 10
        : 0
    }))
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
            .metrics-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 20px 0;
            }
            .metric-box {
              border: 1px solid #ddd;
              padding: 15px;
              background: #f9f9f9;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Solid-CPM</h1>
            <h2>Monthly Report - ${currentMonthInfo.monthName}</h2>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          ${weeklyBreakdown.length > 0 ? `
          <div class="section">
            <h3>Weekly Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Meals</th>
                  <th>Ingredients</th>
                  <th>Cost/Meal</th>
                  <th>Overhead</th>
                  <th>Total CPM</th>
                </tr>
              </thead>
              <tbody>
                ${weeklyBreakdown.map(week => `
                  <tr>
                    <td>Week ${week.weekNumber}</td>
                    <td>${week.mealsServed.toLocaleString()}</td>
                    <td>RWF ${week.ingredientCost.toLocaleString()}</td>
                    <td>RWF ${Math.round(week.costPerMeal).toLocaleString()}</td>
                    <td>RWF ${Math.round(week.overheadPerMeal).toLocaleString()}</td>
                    <td>RWF ${Math.round(week.totalCPM).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td>TOTAL</td>
                  <td>${weeklyTotals.totalMeals.toLocaleString()}</td>
                  <td>RWF ${weeklyTotals.totalIngredientCost.toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgCostPerMeal).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgOverheadPerMeal).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgTotalCPM).toLocaleString()}</td>
                </tr>
                <tr style="background-color: #f9f9f9; font-style: italic;">
                  <td>AVERAGE</td>
                  <td>${Math.round(weeklyAverages.avgMeals).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgIngredientCost).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgCostPerMeal).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgOverheadPerMeal).toLocaleString()}</td>
                  <td>RWF ${Math.round(weeklyAverages.avgTotalCPM).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          ${indirectCostsBreakdown.details.length > 0 ? `
          <div class="section">
            <h3>Indirect Costs</h3>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Indirect Costs</th>
                  <th>Overheads RWF</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                ${indirectCostsBreakdown.details.map(cost => `
                  <tr>
                    <td>${cost.code}</td>
                    <td>${cost.category}</td>
                    <td>${cost.amount.toLocaleString()}</td>
                    <td>${cost.percentage}%</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td colspan="2">Total Indirect Production costs</td>
                  <td>${indirectCostsBreakdown.totalAmount.toLocaleString()}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
            
            <div style="text-align: center; margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
              <div style="font-size: 14pt; font-weight: bold; color: #1976d2; margin-bottom: 10px;">
                Indirect Cost per Meal: RWF ${Math.round(indirectCostsBreakdown.costPerMeal).toLocaleString()}
              </div>
              <div style="font-size: 10pt; color: #1976d2;">
                RWF ${indirectCostsBreakdown.totalAmount.toLocaleString()} ÷ ${indirectCostsBreakdown.totalMeals.toLocaleString()} meals
              </div>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>This report was generated by Solid-CPM - Cost Per Meal Management System</p>
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
    <div className="max-w-6xl mx-auto space-y-6 print-content">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Report</h1>
          <p className="text-gray-600">{currentMonthInfo.monthName}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => alert('Excel export functionality would be implemented here')}
            className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-1 inline" />
            Excel
          </button>
          <button
            onClick={() => alert('PDF export functionality would be implemented here')}
            className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-1 inline" />
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            <Printer className="h-4 w-4 mr-1 inline" />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 no-print">
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

      {/* Weekly Summary Table - Minimalistic with Correct Calculations */}
      {weeklyBreakdown.length > 0 && (
        <div className="bg-white border rounded-lg print-section">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Weekly Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Week</th>
                    <th className="text-right py-3 px-4 font-medium">Meals</th>
                    <th className="text-right py-3 px-4 font-medium">Ingredients</th>
                    <th className="text-right py-3 px-4 font-medium">Cost/Meal</th>
                    <th className="text-right py-3 px-4 font-medium">Overhead</th>
                    <th className="text-right py-3 px-4 font-medium">Total CPM</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyBreakdown.map((week: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">Week {week.weekNumber}</td>
                      <td className="py-3 px-4 text-right">{week.mealsServed.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">RWF {week.ingredientCost.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">RWF {Math.round(week.costPerMeal).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">RWF {Math.round(week.overheadPerMeal).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium">RWF {Math.round(week.totalCPM).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4 text-right">{weeklyTotals.totalMeals.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">RWF {weeklyTotals.totalIngredientCost.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">RWF {Math.round(weeklyAverages.avgCostPerMeal).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">RWF {Math.round(weeklyAverages.avgOverheadPerMeal).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-red-600">RWF {Math.round(weeklyAverages.avgTotalCPM).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-gray-50 italic">
                    <td className="py-3 px-4">AVERAGE</td>
                    <td className="py-3 px-4 text-right">{Math.round(weeklyAverages.avgMeals).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">RWF {Math.round(weeklyAverages.avgIngredientCost).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">RWF {Math.round(weeklyAverages.avgCostPerMeal).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">RWF {Math.round(weeklyAverages.avgOverheadPerMeal).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-blue-600">RWF {Math.round(weeklyAverages.avgTotalCPM).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Service-Based Monthly Analysis */}
      <div className="bg-white border rounded-lg print-section">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Service-Based Monthly Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(serviceBreakdown).map(([service, data]) => (
              <div key={service} className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {service === 'BREAKFAST' ? '🌅 Breakfast' : 
                     service === 'LUNCH' ? '🍽️ Lunch' : 
                     '🌙 Dinner'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{data.totalMeals.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Total Meals</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-600">RWF {Math.round(data.costPerMeal).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Cost/Meal (Ingredients)</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-600">RWF {Math.round(data.overheadPerMeal).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Overhead/Meal</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-purple-600">RWF {Math.round(data.totalCPM).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Total CPM</div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Total Cost: RWF {data.totalCost.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {monthlyTotals.totalMealsServed > 0 ? 
                          `${Math.round((data.totalMeals / monthlyTotals.totalMealsServed) * 100)}% of total meals` : 
                          '0% of total meals'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Service comparison table */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Service Comparison</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium">Service</th>
                    <th className="text-right py-2 px-3 font-medium">Meals</th>
                    <th className="text-right py-2 px-3 font-medium">% of Total</th>
                    <th className="text-right py-2 px-3 font-medium">Ingredient Cost</th>
                    <th className="text-right py-2 px-3 font-medium">Cost/Meal</th>
                    <th className="text-right py-2 px-3 font-medium">Total CPM</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(serviceBreakdown).map(([service, data]) => (
                    <tr key={service} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">
                        {service === 'BREAKFAST' ? '🌅 Breakfast' : 
                         service === 'LUNCH' ? '🍽️ Lunch' : 
                         '🌙 Dinner'}
                      </td>
                      <td className="py-2 px-3 text-right">{data.totalMeals.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">
                        {monthlyTotals.totalMealsServed > 0 ? 
                          `${Math.round((data.totalMeals / monthlyTotals.totalMealsServed) * 100)}%` : 
                          '0%'
                        }
                      </td>
                      <td className="py-2 px-3 text-right">RWF {data.totalCost.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">RWF {Math.round(data.costPerMeal).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-medium">RWF {Math.round(data.totalCPM).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Indirect Costs Breakdown - Minimalistic */}
      {indirectCostsBreakdown.details.length > 0 && (
        <div className="bg-white border rounded-lg print-section">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Indirect Costs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Code</th>
                    <th className="text-left py-3 px-4 font-medium">Indirect Costs</th>
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
                    <td className="py-3 px-4" colSpan={2}>Total Indirect Production costs</td>
                    <td className="py-3 px-4 text-right">{indirectCostsBreakdown.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Indirect Cost per Meal Calculation */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-blue-600 font-medium mb-2">Indirect Cost per Meal</div>
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
              This report uses real-time client-side aggregation. Weekly calculations: Cost/Meal (ingredients only) + Overhead (indirect cost per meal) = Total CPM. 
              Totals and averages are calculated correctly from weekly data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;