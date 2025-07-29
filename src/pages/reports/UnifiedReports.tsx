import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer, TrendingUp, BarChart3, Calculator } from 'lucide-react';
import { purchasesAPI, productionAPI, indirectCostsAPI } from '../../services/api';
import MonthSelector from '../../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../../utils/monthlySystem';
import { exportToPDF } from '../../utils/pdfExport';

interface ServiceCPMData {
  service: string;
  totalCost: number;
  totalMeals: number;
  cpm: number;
}

const UnifiedReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overheadPerMeal, setOverheadPerMeal] = useState(65.7); // Will be calculated from last month
  
  const [serviceCPMData, setServiceCPMData] = useState<ServiceCPMData[]>([]);
  const [totalMeals, setTotalMeals] = useState(0);
  const [reportTitle, setReportTitle] = useState('');

  const availableMonths = generateAvailableMonths();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate week options for selected month
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
    if (reportType === 'weekly' && weekOptions.length > 0 && !selectedWeek) {
      setSelectedWeek(weekOptions[0].id);
    }
  }, [reportType, selectedMonth]);

  useEffect(() => {
    loadReportData();
    loadLastMonthOverhead();
  }, [reportType, selectedDate, selectedMonth, selectedWeek, selectedYear]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      let startDate: Date, endDate: Date, title: string;

      // Determine date range based on report type
      switch (reportType) {
        case 'daily':
          startDate = new Date(selectedDate);
          endDate = new Date(selectedDate);
          endDate.setDate(endDate.getDate() + 1);
          title = `Daily Report - ${new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`;
          break;

        case 'weekly':
          const selectedWeekOption = weekOptions.find(w => w.id === selectedWeek);
          if (!selectedWeekOption) return;
          startDate = new Date(selectedWeekOption.startDate);
          endDate = new Date(selectedWeekOption.endDate);
          endDate.setDate(endDate.getDate() + 1);
          title = `Weekly Report - ${selectedWeekOption.label}`;
          break;

        case 'monthly':
          const monthInfo = parseMonthId(selectedMonth);
          startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
          endDate = new Date(monthInfo.year, monthInfo.month, 0);
          endDate.setDate(endDate.getDate() + 1);
          title = `Monthly Report - ${monthInfo.monthName}`;
          break;

        case 'annual':
          startDate = new Date(selectedYear, 0, 1);
          endDate = new Date(selectedYear + 1, 0, 1);
          title = `Annual Report - ${selectedYear}`;
          break;

        default:
          return;
      }

      setReportTitle(title);

      // Fetch data
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

      // Calculate service-based CPM
      const services = ['BREAKFAST', 'LUNCH', 'DINNER'];
      const serviceData: ServiceCPMData[] = [];
      let grandTotalMeals = 0;

      services.forEach(service => {
        const servicePurchases = purchases.filter((p: any) => p.service === service);
        const serviceProductions = productions.filter((p: any) => p.service === service);
        
        const totalMeals = serviceProductions.reduce((sum: number, p: any) => sum + (p.patientsServed || 0), 0);
        const totalIngredientCost = servicePurchases.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0);
        
        // Use exact formula from Daily Entry: CPM = ((meals × overhead) + ingredient cost) ÷ meals
        // This simplifies to: CPM = overhead + (ingredient cost ÷ meals)
        const calculatedCPM = totalMeals > 0 ? (totalIngredientCost / totalMeals) + overheadPerMeal : 0;
        
        serviceData.push({
          service,
          totalCost: totalIngredientCost,
          totalMeals,
          cpm: calculatedCPM,
          totalCPM: calculatedCPM,
          overheadCost: totalMeals * overheadPerMeal
        });
        
        grandTotalMeals += totalMeals;
      });

      setServiceCPMData(serviceData);
      setTotalMeals(grandTotalMeals);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const exportData = {
      serviceCPMData,
      totalMeals,
      reportType,
      overheadPerMeal
    };

    exportToPDF({
      title: reportTitle,
      subtitle: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      data: exportData,
      type: reportType as any
    }).catch(error => {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    });
  };

  // Load last month's overhead per meal
  const loadLastMonthOverhead = async () => {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      
      // Get last month's indirect costs (which are now per meal amounts)
      const indirectCosts = await Promise.all([
        indirectCostsAPI.getIndirectCosts({
          year: lastMonth.getFullYear(),
          month: lastMonth.getMonth() + 1
        })
      ]);
      
      // Sum up overhead per meal amounts from last month
      const totalOverheadPerMeal = indirectCosts[0].reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
      
      console.log('UnifiedReports - Last month overhead calculation:', {
        totalOverheadPerMeal,
        month: lastMonth.getMonth() + 1
      });
      
      setOverheadPerMeal(Math.round(totalOverheadPerMeal * 100) / 100);
      
      console.log('UnifiedReports - Calculated overhead per meal:', totalOverheadPerMeal);
      
    } catch (err: any) {
      console.error('Failed to load last month overhead:', err);
      setOverheadPerMeal(0); // Use 0 if calculation fails
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'BREAKFAST': return '🌅';
      case 'LUNCH': return '🍽️';
      case 'DINNER': return '🌙';
      default: return '🍽️';
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'BREAKFAST': return 'Breakfast';
      case 'LUNCH': return 'Lunch';
      case 'DINNER': return 'Dinner';
      default: return service;
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
    <div className="space-y-6 print-content">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between no-print">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Service-based cost per meal analysis and reporting
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

      {/* Report Type Selection */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 no-print">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Report Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Report Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            {/* Date Selection based on Report Type */}
            {reportType === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            )}

            {reportType === 'weekly' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {availableMonths.map((month) => {
                      const monthId = `${month.year}-${month.month.toString().padStart(2, '0')}`;
                      return (
                        <option key={monthId} value={monthId}>
                          {month.monthName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {weekOptions.map(week => (
                      <option key={week.id} value={week.id}>{week.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {reportType === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {availableMonths.map((month) => {
                    const monthId = `${month.year}-${month.month.toString().padStart(2, '0')}`;
                    return (
                      <option key={monthId} value={monthId}>
                        {month.monthName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {reportType === 'annual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="print-section" id="report-header">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">{reportTitle}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-section" id="summary-cards">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Meals Served</p>
              <p className="text-2xl font-semibold text-gray-900">{totalMeals.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <Calculator className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">CPM</p>
              <p className="text-2xl font-semibold text-gray-900">RWF {Math.round(serviceCPMData.reduce((sum, s) => sum + (s.totalMeals > 0 ? ((s.totalCost || 0) + (s.totalMeals * overheadPerMeal)) / s.totalMeals : 0), 0) / 3).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service CPM Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="service-cpm-table">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Service Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Meals Served</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPM</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceCPMData.map((service, index) => (
                  <tr key={service.service} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getServiceIcon(service.service)}</span>
                        <div className="text-sm font-medium text-gray-900">
                          {getServiceName(service.service)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      RWF {(service.totalCost || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">
                      {service.totalMeals.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                      {service.totalMeals > 0 ? `RWF ${Math.round(((service.totalCost || 0) + (service.totalMeals * overheadPerMeal)) / service.totalMeals).toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    RWF {serviceCPMData.reduce((sum, s) => sum + (s.totalCost || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {totalMeals.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                    RWF {serviceCPMData.length > 0 && totalMeals > 0 ? Math.round((serviceCPMData.reduce((sum, s) => sum + (s.totalCost || 0), 0) + serviceCPMData.reduce((sum, s) => sum + (s.totalMeals * overheadPerMeal), 0)) / totalMeals).toLocaleString() : '0'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    Average
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-700">
                    RWF {Math.round(serviceCPMData.reduce((sum, s) => sum + (s.totalCost || 0), 0) / 3).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-700">
                    {Math.round(totalMeals / 3).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">
                    RWF {Math.round(serviceCPMData.reduce((sum, s) => sum + (s.totalMeals > 0 ? ((s.totalCost || 0) + (s.totalMeals * overheadPerMeal)) / s.totalMeals : 0), 0) / 3).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedReports;