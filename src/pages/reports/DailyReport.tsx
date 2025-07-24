import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer, TrendingUp, BarChart3, Calculator, Users } from 'lucide-react';
import { reportsAPI, purchasesAPI, productionAPI } from '../../services/api';
import { exportToPDF } from '../../utils/pdfExport';

interface DailyReportData {
  date: string;
  purchases: any[];
  productions: any[];
  totalIngredientCost: number;
  totalMeals: number;
  costPerMeal: number;
  overhead: number;
  totalCPM: number;
  hospitalsServed: number;
  ingredientsUsed: number;
}

const DailyReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DailyReportData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [overheadPerMeal] = useState(65.7); // Last month's calculated overhead per meal

  useEffect(() => {
    loadDailyReport();
  }, [selectedDate]);

  const loadDailyReport = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      const [purchases, productions] = await Promise.all([
        purchasesAPI.getPurchases({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }),
        productionAPI.getProductions({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      ]);

      // Calculate metrics using same logic as Daily Entry
      const totalIngredientCost = purchases.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0);
      // Fixed: Total meals is sum of patientsServed, not beneficiaries or mealsCalculated
      const totalMeals = productions.reduce((sum: number, p: any) => sum + (p.patientsServed || 0), 0);
      const costPerMeal = totalMeals > 0 ? totalIngredientCost / totalMeals : 0;
      const overhead = overheadPerMeal; // Fixed overhead per meal from last month
      const totalCPM = costPerMeal + overhead;

      const hospitalsServed = new Set(productions.map((p: any) => p.hospitalId)).size;
      const ingredientsUsed = purchases.filter((p: any) => p.quantity > 0).length;

      setReportData({
        date: selectedDate,
        purchases,
        productions,
        totalIngredientCost,
        totalMeals,
        costPerMeal,
        overhead,
        totalCPM,
        hospitalsServed,
        ingredientsUsed
      });

      setError(null);
    } catch (err: any) {
      console.error('Failed to load daily report:', err);
      setError('Failed to load daily report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    console.log('Exporting to Excel...');
    alert('Excel export functionality would be implemented here');
  };

  const handleExportPDF = () => {
    if (!reportData) {
      alert('No data available to export');
      return;
    }

    if (!reportData) {
      alert('No data available to export');
      return;
    }

    const title = `Daily Report - ${new Date(selectedDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;

    exportToPDF({
      title,
      subtitle: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      data: reportData,
      type: 'daily'
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
          <title>Daily Report - ${new Date(selectedDate).toLocaleDateString()}</title>
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
            <h2>Daily Report - ${new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</h2>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="section">
            <h3>Daily Summary</h3>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="value">${reportData?.totalMeals.toLocaleString() || '0'}</div>
                <div class="label">Total Meals</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${reportData ? Math.round(reportData.costPerMeal).toLocaleString() : '0'}</div>
                <div class="label">Cost/Meal</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${reportData ? Math.round(reportData.overhead).toLocaleString() : '0'}</div>
                <div class="label">Overhead per Meal</div>
              </div>
              <div class="summary-card">
                <div class="value">RWF ${reportData ? Math.round(reportData.totalCPM).toLocaleString() : '0'}</div>
                <div class="label">Total CPM</div>
              </div>
            </div>
          </div>

          ${reportData && reportData.purchases.length > 0 ? `
          <div class="section">
            <h3>Ingredients Purchased</h3>
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.purchases.map((purchase: any) => `
                  <tr>
                    <td>${purchase.ingredient?.name || 'Unknown'} (${purchase.ingredient?.unit || ''})</td>
                    <td>${purchase.quantity}</td>
                    <td>RWF ${purchase.unitPrice.toLocaleString()}</td>
                    <td>RWF ${purchase.totalPrice.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td colspan="3">Total Ingredient Cost</td>
                  <td>RWF ${reportData.totalIngredientCost.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : '<div class="section"><h3>Ingredients Purchased</h3><p>No ingredients purchased on this date</p></div>'}

          ${reportData && reportData.productions.length > 0 ? `
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
                ${reportData.productions.map((production: any) => `
                  <tr>
                    <td>${production.hospital?.name || 'Unknown Hospital'}</td>
                    <td>${production.service || 'Unknown'}</td>
                    <td>${(production.patientsServed || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr style="background-color: #f0f0f0; font-weight: bold;">
                  <td colspan="2">Total</td>
                  <td>${reportData.totalMeals.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : '<div class="section"><h3>Food Production by Hospital</h3><p>No production recorded on this date</p></div>'}

          <div class="footer">
            <p>This report was generated by GEMURA - Cost Per Meal Management System</p>
            <p>Daily Report for ${new Date(selectedDate).toLocaleDateString()}</p>
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

  if (loading && !reportData) {
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
            Daily Report - {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Detailed daily analysis with cost breakdown and production metrics
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

      {/* Date Selection */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 no-print">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Select Date</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overhead per Meal</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                RWF {overheadPerMeal.toLocaleString()} (from last month)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-section" id="daily-summary">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Meals</p>
              <p className="text-2xl font-semibold text-gray-900">{reportData?.totalMeals.toLocaleString() || '0'}</p>
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
              <p className="text-2xl font-semibold text-gray-900">RWF {reportData ? Math.round(reportData.costPerMeal).toLocaleString() : '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overhead per Meal</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {reportData ? Math.round(reportData.overhead).toLocaleString() : '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total CPM</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {reportData ? Math.round(reportData.totalCPM).toLocaleString() : '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-section" id="additional-metrics">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{reportData?.totalIngredientCost.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-500">Total Ingredient Cost (RWF)</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{reportData?.hospitalsServed || '0'}</div>
            <div className="text-sm text-gray-500">Hospitals Served</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{reportData?.ingredientsUsed || '0'}</div>
            <div className="text-sm text-gray-500">Ingredients Used</div>
          </div>
        </div>
      </div>

      {/* Ingredients Purchased */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="ingredients-purchased">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Ingredients Purchased</h3>
        </div>
        <div className="p-6">
          {!reportData || reportData.purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No ingredients purchased on this date
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.purchases.map((purchase: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {purchase.ingredient?.name || 'Unknown'}
                        <div className="text-xs text-gray-500">({purchase.ingredient?.unit || ''})</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{purchase.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">RWF {purchase.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">RWF {purchase.totalPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={3}>Total Ingredient Cost</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">RWF {reportData.totalIngredientCost.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Food Production */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="food-production">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Food Production by Hospital</h3>
        </div>
        <div className="p-6">
          {!reportData || reportData.productions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No production recorded on this date
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hospital</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patients Served</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.productions.map((production: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {production.hospital?.name || 'Unknown Hospital'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {production.service || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{(production.patientsServed || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={2}>Total</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                      {reportData.totalMeals.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cost Analysis Summary */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="cost-analysis">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cost Analysis Summary</h3>
        </div>
        <div className="p-6">
          <div className="bg-red-50 rounded-lg p-6">
            <div className="text-center">
              <div className="text-sm text-red-600 font-medium mb-2">Daily Cost Breakdown</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-lg font-bold text-red-900">RWF {reportData ? Math.round(reportData.costPerMeal).toLocaleString() : '0'}</div>
                  <div className="text-red-700">Cost per Meal (Ingredients)</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-900">RWF {reportData ? Math.round(reportData.overhead).toLocaleString() : '0'}</div>
                  <div className="text-red-700">Overhead ({overheadPercentage}%)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-900">RWF {reportData ? Math.round(reportData.totalCPM).toLocaleString() : '0'}</div>
                  <div className="text-red-700">Total Cost per Meal</div>
                </div>
              </div>
              <div className="text-sm text-red-700 mt-4">
                Calculation: RWF {reportData ? Math.round(reportData.costPerMeal).toLocaleString() : '0'} + RWF {overheadPerMeal.toLocaleString()} = RWF {reportData ? Math.round(reportData.totalCPM).toLocaleString() : '0'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReport;