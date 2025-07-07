import React, { useState, useEffect } from 'react';
import { Save, Check, X, Calendar, AlertCircle, Eye, Edit2, Trash2 } from 'lucide-react';
import { hospitalsAPI, productionAPI } from '../services/api';
import MonthSelector from '../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId, getMonthStatus } from '../utils/monthlySystem';

interface Hospital {
  id: string;
  name: string;
  location: string;
  patients: number;
  active: boolean;
}

interface HospitalProduction {
  hospitalId: string;
  hospitalName: string;
  starchProduced: number;
  vegetablesProduced: number;
  totalKg: number;
  starchPortions: number;
  vegPortions: number;
  pax: number;
  mealsCalculated: number;
}

interface ExistingProduction {
  id: string;
  hospitalId: string;
  productionDate: string;
  starchKg: number;
  vegetablesKg: number;
  totalKg: number;
  starchPortionPerKg: number;
  vegPortionPerKg: number;
  beneficiaries: number;
  mealsCalculated: number;
  hospital?: {
    name: string;
  };
}

const ProductionEntry: React.FC = () => {
  const [activeHospitals, setActiveHospitals] = useState<Hospital[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hospitalProductions, setHospitalProductions] = useState<HospitalProduction[]>([]);
  const [existingProductions, setExistingProductions] = useState<ExistingProduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showExistingData, setShowExistingData] = useState(true);

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);
  const monthStatus = getMonthStatus(currentMonthInfo);

  // Load schools on component mount
  useEffect(() => {
    loadHospitals();
  }, []);

  // Initialize school productions when schools are loaded
  useEffect(() => {
    if (activeHospitals.length > 0) {
      initializeHospitalProductions();
    }
  }, [activeHospitals]);

  // Load existing productions when month changes
  useEffect(() => {
    loadExistingProductions();
  }, [selectedMonth]);

  // Update date when month changes
  useEffect(() => {
    const monthInfo = parseMonthId(selectedMonth);
    const firstDayOfMonth = new Date(monthInfo.year, monthInfo.month - 1, 1);
    const today = new Date();
    
    // If current month, use today's date, otherwise use first day of month
    if (monthInfo.isCurrentMonth) {
      setSelectedDate(today.toISOString().split('T')[0]);
    } else {
      setSelectedDate(firstDayOfMonth.toISOString().split('T')[0]);
    }
  }, [selectedMonth]);

    try {
      const data = await hospitalsAPI.getHospitals();
      const active = data.filter((hospital: Hospital) => hospital.active);
      setActiveHospitals(active);
    } catch (err: any) {
      setError('Failed to load hospitals');
    }
  };

  const loadExistingProductions = async () => {
    try {
      const monthInfo = parseMonthId(selectedMonth);
      const startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
      const endDate = new Date(monthInfo.year, monthInfo.month, 0);
      
      const data = await productionAPI.getProductions({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      
      setExistingProductions(data);
    } catch (err: any) {
      console.error('Failed to load existing productions:', err);
      setExistingProductions([]);
    }
  };

    const initialProductions = activeHospitals.map(hospital => ({
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      starchProduced: 0,
      vegetablesProduced: 0,
      totalKg: 0,
      starchPortions: 0,
      vegPortions: 0,
      pax: 0,
      mealsCalculated: 0,
    }));
    setHospitalProductions(initialProductions);
  };

  const showSuccessMessage = (message: string) => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Update school production data
  // Update hospital production data
  const updateHospitalProduction = (hospitalId: string, field: keyof HospitalProduction, value: number) => {
    setHospitalProductions(productions => 
      productions.map(production => {
        if (production.hospitalId === hospitalId) {
          const updatedProduction = { ...production, [field]: value };
          
          // Auto-calculate total kg
          if (field === 'starchProduced' || field === 'vegetablesProduced') {
            updatedProduction.totalKg = updatedProduction.starchProduced + updatedProduction.vegetablesProduced;
          }
          
          // Auto-calculate meals (only if portions are provided)
          if (field === 'starchProduced' || field === 'vegetablesProduced' || 
              field === 'starchPortions' || field === 'vegPortions') {
            let starchMeals = 0;
            let vegetableMeals = 0;
            
            // Calculate starch meals only if both starch kg and portions are provided
            if (updatedProduction.starchProduced > 0 && updatedProduction.starchPortions > 0) {
              starchMeals = updatedProduction.starchProduced * updatedProduction.starchPortions;
            }
            
            // Calculate vegetable meals only if both vegetable kg and portions are provided
            if (updatedProduction.vegetablesProduced > 0 && updatedProduction.vegPortions > 0) {
              vegetableMeals = updatedProduction.vegetablesProduced * updatedProduction.vegPortions;
            }
            
            updatedProduction.mealsCalculated = starchMeals + vegetableMeals;
          }
          
          return updatedProduction;
        }
        return production;
      })
    );
  };

  // Delete existing production
  const deleteProduction = async (productionId: string) => {
    if (!confirm('Are you sure you want to delete this production record?')) {
      return;
    }

    try {
      setLoading(true);
      await productionAPI.deleteProduction(productionId);
      await loadExistingProductions();
      showSuccessMessage('Production record deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete production record');
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily summary
  const dailySummary = {
    totalKgProduced: hospitalProductions.reduce((sum, hospital) => sum + hospital.totalKg, 0),
    totalPax: hospitalProductions.reduce((sum, hospital) => sum + hospital.pax, 0),
    totalMealsCalculated: hospitalProductions.reduce((sum, hospital) => sum + hospital.mealsCalculated, 0),
    averagePortionsPerKg: hospitalProductions.length > 0 
      ? hospitalProductions.reduce((sum, hospital) => {
          const avgPortions = hospital.totalKg > 0 ? hospital.mealsCalculated / hospital.totalKg : 0;
          return sum + avgPortions;
        }, 0) / hospitalProductions.length
      : 0,
  };

  // Calculate monthly summary from existing data
  const monthlySummary = {
    totalProductions: existingProductions.length,
    totalMealsProduced: existingProductions.reduce((sum, prod) => sum + (prod.mealsCalculated || 0), 0),
    totalKgProduced: existingProductions.reduce((sum, prod) => sum + prod.totalKg, 0),
    uniqueDays: new Set(existingProductions.map(prod => new Date(prod.productionDate).toDateString())).size,
    hospitalsServed: new Set(existingProductions.map(prod => prod.hospitalId)).size
  };

  // Validate form
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!selectedDate) {
      errors.push('Please select a date');
    }

    // Check if date is within selected month
    const dateObj = new Date(selectedDate);
    const monthInfo = parseMonthId(selectedMonth);
    if (dateObj.getFullYear() !== monthInfo.year || dateObj.getMonth() + 1 !== monthInfo.month) {
      errors.push('Selected date must be within the selected month');
    }

    const validProductions = hospitalProductions.filter(hospital => 
      hospital.starchProduced > 0 || hospital.vegetablesProduced > 0 || hospital.pax > 0
    );

    if (validProductions.length === 0) {
      errors.push('At least one hospital must have production data');
    }
    
    hospitalProductions.forEach((hospital) => {
      if (hospital.starchProduced > 0 || hospital.vegetablesProduced > 0 || hospital.pax > 0) {
        if (hospital.starchProduced < 0) {
          errors.push(`${hospital.hospitalName}: Starch produced cannot be negative`);
        }
        if (hospital.vegetablesProduced < 0) {
          errors.push(`${hospital.hospitalName}: Vegetables produced cannot be negative`);
        }
        if (hospital.starchPortions < 0) {
          errors.push(`${hospital.hospitalName}: Starch portions cannot be negative`);
        }
        if (hospital.vegPortions < 0) {
          errors.push(`${hospital.hospitalName}: Vegetable portions cannot be negative`);
        }
        if (hospital.pax < 0) {
          errors.push(`${hospital.hospitalName}: Pax cannot be negative`);
        }
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save production data
  const saveProduction = async () => {
    if (!validateForm()) {
      return;
    }

    if (!monthStatus.canEdit) {
      setError('Cannot edit production for past months');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Filter out schools with no production data
      const validProductions = hospitalProductions.filter(hospital => 
        hospital.starchProduced > 0 || hospital.vegetablesProduced > 0 || hospital.pax > 0
      );

      // Create production records for each school
      for (const production of validProductions) {
        const productionData = {
          hospitalId: production.hospitalId,
          productionDate: new Date(selectedDate).toISOString(),
          starchKg: production.starchProduced,
          vegetablesKg: production.vegetablesProduced,
          totalKg: production.totalKg,
          starchPortionPerKg: production.starchPortions || 0,
          vegPortionPerKg: production.vegPortions || 0,
          patientsServed: production.pax,
          mealsCalculated: production.mealsCalculated,
          weekId: 'temp-week-id' // This would be calculated based on the date
        };

        await productionAPI.createProduction(productionData);
      }

      // Reset form and reload data
      initializeHospitalProductions();
      await loadExistingProductions();
      setValidationErrors([]);
      showSuccessMessage(`Production data for ${currentMonthInfo.monthName} saved successfully!`);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save production data');
    } finally {
      setLoading(false);
    }
  };

  // Get date constraints for the selected month
  const getDateConstraints = () => {
    const monthInfo = parseMonthId(selectedMonth);
    const firstDay = new Date(monthInfo.year, monthInfo.month - 1, 1);
    const lastDay = new Date(monthInfo.year, monthInfo.month, 0);
    
    return {
      min: firstDay.toISOString().split('T')[0],
      max: lastDay.toISOString().split('T')[0]
    };
  };

  const dateConstraints = getDateConstraints();

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Monthly Production Entry
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Record meal production for {currentMonthInfo.monthName} - each month starts fresh for all schools
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${monthStatus.statusColor}`}>
            {monthStatus.statusText} Month
          </span>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Production data saved successfully!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <X className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <X className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="text-red-700 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Month Selection */}
      <MonthSelector
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Monthly Summary */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {currentMonthInfo.monthName} Production Summary
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{monthlySummary.totalProductions}</div>
              <div className="text-sm text-gray-500">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{monthlySummary.totalMealsProduced.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Meals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{monthlySummary.totalKgProduced.toFixed(1)} kg</div>
              <div className="text-sm text-gray-500">Total Kg</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{monthlySummary.uniqueDays}</div>
              <div className="text-sm text-gray-500">Days with Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{monthlySummary.schoolsServed}</div>
              <div className="text-2xl font-bold text-red-600">{monthlySummary.hospitalsServed}</div>
              <div className="text-sm text-gray-500">Hospitals Served</div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Productions for the Month */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Existing Production Records for {currentMonthInfo.monthName}
            </h3>
            <button
              onClick={() => setShowExistingData(!showExistingData)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showExistingData ? 'Hide' : 'Show'} Data
            </button>
          </div>
        </div>
        {showExistingData && (
          <div className="p-6">
            {existingProductions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No production records found for {currentMonthInfo.monthName}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Starch (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vegetables (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pax</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals</th>
                      {monthStatus.canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {existingProductions.map((production) => (
                      <tr key={production.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(production.productionDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {production.hospital?.name || 'Unknown Hospital'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {production.starchKg.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {production.vegetablesKg.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {production.totalKg.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {production.patientsServed.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {production.mealsCalculated.toLocaleString()}
                        </td>
                        {monthStatus.canEdit && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => deleteProduction(production.id)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-900 transition-colors duration-200"
                                title="Delete production record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date Selection */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-red-600" />
            Production Date in {currentMonthInfo.monthName}
          </h3>
        </div>
        <div className="p-6">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={dateConstraints.min}
              max={dateConstraints.max}
              disabled={!monthStatus.canEdit}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
            <p className="mt-1 text-sm text-gray-500">
              {monthStatus.canEdit 
                ? `You can enter production for any date in ${currentMonthInfo.monthName}`
                : 'Past months cannot be edited'
              }
            </p>
          </div>
        </div>
      </div>

      {/* School Production Forms */}
      {/* Hospital Production Forms */}
      <div className="space-y-4">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Production for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            {!monthStatus.canEdit && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-gray-700 text-sm">
                    This month is locked for editing. You can only view the data.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

          <div key={hospital.hospitalId} className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{hospital.hospitalName}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Starch Produced */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starch Produced (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={hospital.starchProduced || ''}
                    onChange={(e) => updateHospitalProduction(hospital.hospitalId, 'starchProduced', parseFloat(e.target.value) || 0)}
                    disabled={!monthStatus.canEdit}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Vegetables Produced */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vegetables Produced (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={hospital.vegetablesProduced || ''}
                    onChange={(e) => updateHospitalProduction(hospital.hospitalId, 'vegetablesProduced', parseFloat(e.target.value) || 0)}
                    disabled={!monthStatus.canEdit}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Total Kg (Display Only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Kg</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-900 font-medium">
                    {hospital.totalKg.toFixed(1)} kg
                  </div>
                </div>

                {/* Starch Portions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starch/Port (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={hospital.starchPortions || ''}
                    onChange={(e) => updateHospitalProduction(hospital.hospitalId, 'starchPortions', parseFloat(e.target.value) || 0)}
                    disabled={!monthStatus.canEdit}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Vegetable Portions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veg/Port (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={hospital.vegPortions || ''}
                    onChange={(e) => updateHospitalProduction(hospital.hospitalId, 'vegPortions', parseFloat(e.target.value) || 0)}
                    disabled={!monthStatus.canEdit}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Pax */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pax</label>
                  <input
                    type="number"
                    min="0"
                    value={hospital.pax || ''}
                    onChange={(e) => updateHospitalProduction(hospital.hospitalId, 'pax', parseInt(e.target.value) || 0)}
                    disabled={!monthStatus.canEdit}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Meals Calculation (Display Only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meals Calculated</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-blue-50 text-blue-900 font-medium">
                    {hospital.mealsCalculated.toLocaleString()} meals
                  </div>
                </div>
              </div>

              {/* School Summary */}
              {/* Hospital Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Starch Meals:</span>
                    <div className="font-medium text-gray-900">
                      {(hospital.starchProduced * hospital.starchPortions).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Vegetable Meals:</span>
                    <div className="font-medium text-gray-900">
                      {(hospital.vegetablesProduced * hospital.vegPortions).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Coverage:</span>
                    <div className="font-medium text-gray-900">
                      {hospital.pax > 0 
                        ? `${Math.round((hospital.mealsCalculated / hospital.pax) * 100)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Summary */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Daily Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{dailySummary.totalKgProduced.toFixed(1)} kg</div>
              <div className="text-sm text-gray-500">Total Kg Produced</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{dailySummary.totalPax.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Pax</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{dailySummary.totalMealsCalculated.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Meals Calculated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{dailySummary.averagePortionsPerKg.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Average Portions per Kg</div>
            </div>
          </div>

          {monthStatus.canEdit && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveProduction}
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Production for {currentMonthInfo.monthName}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionEntry;