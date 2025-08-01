import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Check, AlertCircle } from 'lucide-react';
import { indirectCostsAPI, productionAPI } from '../services/api';
import MonthSelector from '../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId, getMonthStatus } from '../utils/monthlySystem';

interface IndirectCost {
  id: string;
  month: number;
  year: number;
  category: string;
  description: string;
  amount: number;
  code?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const IndirectCosts: React.FC = () => {
  const [costs, setCosts] = useState<IndirectCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));

  const [newCost, setNewCost] = useState({
    category: '',
    description: '',
    amountPerMeal: '', // Changed from amount to amountPerMeal
    code: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<IndirectCost | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);
  const monthStatus = getMonthStatus(currentMonthInfo);

  // Get total meals for the month from production data (for display only)
  const [totalMealsForMonth, setTotalMealsForMonth] = useState(0);

  const categories = [
    'PC Staff Salaries',
    'Staff delivery fees',
    'Utilities',
    'Administrative costs',
    'DCOI Kitchen Fuel - Gas',
    'ICOI Casual Labour',
    'ICOI Electricity',
    'ICOI Water',
    'Vehicle & Equip repairs',
    'Other operational costs'
  ];

  useEffect(() => {
    loadIndirectCosts();
    loadMonthlyMeals();
  }, [selectedMonth]);

  // Also load on component mount
  useEffect(() => {
    loadIndirectCosts();
    loadMonthlyMeals();
  }, []);

  const loadMonthlyMeals = async () => {
    try {
      const monthInfo = parseMonthId(selectedMonth);
      const startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
      const endDate = new Date(monthInfo.year, monthInfo.month, 0);
      endDate.setDate(endDate.getDate() + 1);

      const productions = await productionAPI.getProductions({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      const totalMeals = productions.reduce((sum: number, prod: any) => sum + (prod.patientsServed || 0), 0);
      setTotalMealsForMonth(totalMeals);
    } catch (err: any) {
      console.error('Failed to load monthly meals:', err);
      setTotalMealsForMonth(0);
    }
  };
  const loadIndirectCosts = async () => {
    try {
      setLoading(true);
      const monthInfo = parseMonthId(selectedMonth);

      console.log('Loading indirect costs for:', monthInfo);
      const data = await indirectCostsAPI.getIndirectCosts({
        year: monthInfo.year,
        month: monthInfo.month
      });
      console.log('Loaded indirect costs:', data);
      setCosts(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading indirect costs:', err);
      setError(err.response?.data?.detail || 'Failed to load indirect costs');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Calculate totals
  const totalOverheadPerMeal = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const totalOverheadAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const overheadPerMealForNextMonth = totalMealsForMonth > 0 ? totalOverheadAmount / totalMealsForMonth : 0;

  // Validate form
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!newCost.category) {
      errors.push('Please select a category');
    }
    if (!newCost.description.trim()) {
      errors.push('Please enter a description');
    }
    if (!newCost.amountPerMeal || parseFloat(newCost.amountPerMeal) < 0) {
      errors.push('Please enter a valid overhead amount per meal (can be 0)');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Add new cost
  const addCost = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const monthInfo = parseMonthId(selectedMonth);

      const costData = {
        month: monthInfo.month,
        year: monthInfo.year,
        category: newCost.category,
        description: newCost.description,
        amount: parseFloat(newCost.amountPerMeal), // Store as amount per meal
        code: newCost.code || undefined,
      };

      await indirectCostsAPI.createIndirectCost(costData);
      await loadIndirectCosts();
      
      setNewCost({ category: '', description: '', amountPerMeal: '', code: '' });
      setValidationErrors([]);
      showSuccess('Indirect cost added successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add indirect cost');
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const startEditing = (cost: IndirectCost) => {
    setEditingId(cost.id);
    setEditingCost({ ...cost });
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingCost) return;

    try {
      setLoading(true);
      const updateData = {
        category: editingCost.category,
        description: editingCost.description,
        amount: editingCost.amount,
        code: editingCost.code || undefined,
      };

      await indirectCostsAPI.updateIndirectCost(editingCost.id, updateData);
      await loadIndirectCosts();
      
      setEditingId(null);
      setEditingCost(null);
      showSuccess('Indirect cost updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update indirect cost');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditingCost(null);
  };

  // Delete cost
  const deleteCost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this indirect cost?')) {
      return;
    }

    try {
      setLoading(true);
      await indirectCostsAPI.deleteIndirectCost(id);
      await loadIndirectCosts();
      showSuccess('Indirect cost deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete indirect cost');
    } finally {
      setLoading(false);
    }
  };

  // Update editing cost
  const updateEditingCost = (field: keyof IndirectCost, value: any) => {
    if (editingCost) {
      setEditingCost({ ...editingCost, [field]: value });
    }
  };

  if (loading && costs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const totalOverheadAmountForMonth = totalOverheadPerMeal * totalMealsForMonth;

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Monthly Overheads
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track operational expenses and overhead costs for {currentMonthInfo.monthName}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${monthStatus.statusColor}`}>
            {monthStatus.statusText} Month
          </span>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600">Overhead per Meal</div>
            <div className="text-2xl font-bold text-blue-700">RWF {totalOverheadPerMeal.toLocaleString()}</div>
            <div className="text-xs text-red-600 mt-1">
              Sum of all overhead per meal amounts
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
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

      {/* Add New Cost Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add New Overhead (Per Meal)</h3>
          <p className="text-sm text-gray-500 mt-1">
            Enter overhead costs per meal. This will be used for next month's calculations.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newCost.category}
                onChange={(e) => setNewCost({ ...newCost, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code (Optional)</label>
              <input
                type="text"
                value={newCost.code}
                onChange={(e) => setNewCost({ ...newCost, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., 5117"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter cost description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount per Meal (RWF)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={newCost.amountPerMeal}
                onChange={(e) => setNewCost({ ...newCost, amountPerMeal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter amount per meal for this category"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={addCost}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Adding...' : 'Add Overhead'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Month's Costs List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Overhead per Meal for {currentMonthInfo.monthName}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            These overhead amounts per meal will be used for next month's cost calculations.
          </p>
        </div>
        <div className="p-6">
          {costs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No overheads recorded for this month
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount per Meal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costs.map((cost) => (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === cost.id ? (
                          <input
                            type="text"
                            value={editingCost?.code || ''}
                            onChange={(e) => updateEditingCost('code', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            placeholder="Code"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{cost.code || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === cost.id ? (
                          <select
                            value={editingCost?.category || ''}
                            onChange={(e) => updateEditingCost('category', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            {categories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {cost.category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === cost.id ? (
                          <input
                            type="text"
                            value={editingCost?.description || ''}
                            onChange={(e) => updateEditingCost('description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{cost.description}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === cost.id ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={editingCost?.amount || ''}
                            onChange={(e) => updateEditingCost('amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">RWF {cost.amount.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingId === cost.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              disabled={loading}
                              className="text-green-600 hover:text-green-900 transition-colors duration-200"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditing(cost)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteCost(cost.id)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Running Total */}
          {costs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm text-blue-600 font-medium mb-1">Total Overhead per Meal</div>
                    <div className="text-2xl font-bold text-blue-900">RWF {totalOverheadPerMeal.toLocaleString()}</div>
                    <div className="text-xs text-blue-700 mt-1">Sum of all overhead per meal amounts</div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm text-green-600 font-medium mb-1">Total Meals This Month</div>
                    <div className="text-2xl font-bold text-green-900">{totalMealsForMonth.toLocaleString()}</div>
                    <div className="text-xs text-green-700 mt-1">From production data</div>
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm text-red-600 font-medium mb-1">Total Overhead Amount</div>
                    <div className="text-2xl font-bold text-red-900">RWF {Math.round(totalOverheadAmountForMonth).toLocaleString()}</div>
                    <div className="text-xs text-red-700 mt-1">Overhead per meal × Total meals</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndirectCosts;