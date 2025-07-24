import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Printer, TrendingUp, BarChart3, Calculator } from 'lucide-react';
import { purchasesAPI, productionAPI, indirectCostsAPI } from '../../services/api';
import MonthSelector from '../../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../../utils/monthlySystem';
import { exportToPDF } from '../../utils/pdfExport';

interface ServiceCPMData {
  service: string;
  cpm: number;
  averageCPM: number;
  totalMeals: number;
}

const UnifiedReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overheadPercentage, setOverheadPercentage] = useState(15);
  
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
  }, [reportType, selectedDate, selectedMonth, selectedWeek, selectedYear, overheadPercentage]);

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
        
        const totalCost = servicePurchases.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0);
        const totalMeals = serviceProductions.reduce((sum: number, p: any) => sum + (p.patientsServed || 0), 0);
        
        let cpm = 0;
        let averageCPM = 0;
        
        if (totalMeals > 0) {
          const costPerMeal = totalCost / totalMeals;
          const overhead = costPerMeal * (overheadPercentage / 100);
          cpm = costPerMeal;
          averageCPM = costPerMeal + overhead;
        }

        serviceData.push({
          service,
          cpm: Math.round(cpm),
          averageCPM: Math.round(averageCPM),
          totalMeals
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
      overheadPercentage
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

            {/* Overhead Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overhead %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={overheadPercentage}
                onChange={(e) => setOverheadPercentage(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="print-section" id="report-header">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">{reportTitle}</h1>
      </div>

      {/* Service CPM Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 print-section" id="service-cpm-table">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Service Cost Per Meal Analysis</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPM (Ingredients Only)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average CPM (With Overhead)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average CPM (With Overheads)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Meals</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">
                      RWF {service.cpm.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      RWF {service.averageCPM.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {service.totalMeals.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    Total Meals
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900" colSpan={2}>
                    {/* Empty cells for alignment */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                    {totalMeals.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{totalMeals.toLocaleString()}</div>
                <div className="text-sm text-blue-700">Total Meals Served</div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">RWF {overheadPerMeal.toLocaleString()}</div>
                <div className="text-sm text-green-700">Overhead per Meal</div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {serviceCPMData.length > 0 ? serviceCPMData.filter(s => s.totalMeals > 0).length : 0}
                </div>
                <div className="text-sm text-purple-700">Active Services</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedReports;