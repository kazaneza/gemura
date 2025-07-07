import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Save, Check, X, Calendar, AlertCircle, Eye } from 'lucide-react';
import { purchasesAPI, ingredientsAPI } from '../services/api';
import MonthSelector from '../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId, getMonthStatus } from '../utils/monthlySystem';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  lastPrice: number;
}

interface PurchaseItem {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  date: string;
}

interface ExistingPurchase {
  id: string;
  ingredientId: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ingredient?: {
    name: string;
    unit: string;
  };
}

const PurchaseEntry: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [existingPurchases, setExistingPurchases] = useState<ExistingPurchase[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIngredientDropdown, setShowIngredientDropdown] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showExistingData, setShowExistingData] = useState(true);

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);
  const monthStatus = getMonthStatus(currentMonthInfo);

  // Load ingredients on component mount
  useEffect(() => {
    loadIngredients();
  }, []);

  // Initialize with one empty item
  useEffect(() => {
    if (purchaseItems.length === 0) {
      addPurchaseItem();
    }
  }, []);

  // Load existing purchases when month changes
  useEffect(() => {
    loadExistingPurchases();
  }, [selectedMonth]);

  // Update items when date changes
  useEffect(() => {
    setPurchaseItems(items => 
      items.map(item => ({ ...item, date: selectedDate }))
    );
  }, [selectedDate]);

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

  const loadIngredients = async () => {
    try {
      const data = await ingredientsAPI.getIngredients();
      setIngredients(data);
    } catch (err: any) {
      setError('Failed to load ingredients');
    }
  };

  const loadExistingPurchases = async () => {
    try {
      const monthInfo = parseMonthId(selectedMonth);
      const startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
      const endDate = new Date(monthInfo.year, monthInfo.month, 0);
      
      const data = await purchasesAPI.getPurchases({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      
      setExistingPurchases(data);
    } catch (err: any) {
      console.error('Failed to load existing purchases:', err);
      setExistingPurchases([]);
    }
  };

  const showSuccessMessage = (message: string) => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Add new purchase item
  const addPurchaseItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      ingredientId: '',
      ingredientName: '',
      quantity: 0,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
      date: selectedDate,
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  // Remove purchase item
  const removePurchaseItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  // Delete existing purchase
  const deletePurchase = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to delete this purchase record?')) {
      return;
    }

    try {
      setLoading(true);
      await purchasesAPI.deletePurchase(purchaseId);
      await loadExistingPurchases();
      showSuccessMessage('Purchase record deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete purchase record');
    } finally {
      setLoading(false);
    }
  };

  // Update purchase item
  const updatePurchaseItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total price
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
          }
          
          // Update date
          updatedItem.date = selectedDate;
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Select ingredient
  const selectIngredient = (itemId: string, ingredient: Ingredient) => {
    updatePurchaseItem(itemId, 'ingredientId', ingredient.id);
    updatePurchaseItem(itemId, 'ingredientName', ingredient.name);
    updatePurchaseItem(itemId, 'unit', ingredient.unit);
    updatePurchaseItem(itemId, 'unitPrice', ingredient.lastPrice);
    setShowIngredientDropdown(null);
    setSearchTerm('');
  };

  // Filter ingredients based on search
  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalItems = purchaseItems.length;
  const totalCost = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Calculate monthly summary from existing data
  const monthlySummary = {
    totalPurchases: existingPurchases.length,
    totalCost: existingPurchases.reduce((sum, purchase) => sum + purchase.totalPrice, 0),
    uniqueIngredients: new Set(existingPurchases.map(purchase => purchase.ingredientId)).size,
    uniqueDays: new Set(existingPurchases.map(purchase => new Date(purchase.purchaseDate).toDateString())).size
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

    const validItems = purchaseItems.filter(item => item.ingredientName && item.quantity > 0);
    if (validItems.length === 0) {
      errors.push('At least one valid purchase item is required');
    }

    purchaseItems.forEach((item, index) => {
      if (item.ingredientName) {
        if (item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (item.unitPrice <= 0) {
          errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
        }
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save purchase
  const savePurchase = async () => {
    if (!validateForm()) {
      return;
    }

    if (!monthStatus.canEdit) {
      setError('Cannot edit purchases for past months');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter out empty items
      const validItems = purchaseItems.filter(item => 
        item.ingredientName && item.quantity > 0 && item.unitPrice > 0
      );

      // Create purchases for each item
      for (const item of validItems) {
        const purchaseData = {
          ingredientId: item.ingredientId,
          purchaseDate: new Date(item.date).toISOString(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          weekId: 'temp-week-id' // This would be calculated based on the date
        };

        await purchasesAPI.createPurchase(purchaseData);
      }

      // Clear form and reload data
      setPurchaseItems([]);
      addPurchaseItem(); // Add one empty item
      await loadExistingPurchases();
      setValidationErrors([]);
      showSuccessMessage(`Purchases for ${currentMonthInfo.monthName} saved successfully!`);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save purchases');
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
            Monthly Purchase Entry
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Record ingredient purchases for {currentMonthInfo.monthName} - each month starts fresh
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
            <span className="text-green-800 font-medium">Purchases saved successfully!</span>
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
            {currentMonthInfo.monthName} Purchase Summary
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{monthlySummary.totalPurchases}</div>
              <div className="text-sm text-gray-500">Total Purchases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">RWF {monthlySummary.totalCost.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{monthlySummary.uniqueIngredients}</div>
              <div className="text-sm text-gray-500">Unique Ingredients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{monthlySummary.uniqueDays}</div>
              <div className="text-sm text-gray-500">Days with Purchases</div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Purchases for the Month */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Existing Purchase Records for {currentMonthInfo.monthName}
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
            {existingPurchases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No purchase records found for {currentMonthInfo.monthName}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                      {monthStatus.canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {existingPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {purchase.ingredient?.name || 'Unknown Ingredient'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.quantity} {purchase.ingredient?.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RWF {purchase.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          RWF {purchase.totalPrice.toLocaleString()}
                        </td>
                        {monthStatus.canEdit && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deletePurchase(purchase.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                              title="Delete purchase record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
            Purchase Date in {currentMonthInfo.monthName}
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
                ? `You can enter purchases for any date in ${currentMonthInfo.monthName}`
                : 'Past months cannot be edited'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Items Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Purchase Items for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
        </div>
        <div className="p-6">
          {!monthStatus.canEdit && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-gray-700 text-sm">
                  This month is locked for editing. You can only view the data.
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {purchaseItems.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                  {purchaseItems.length > 1 && monthStatus.canEdit && (
                    <button
                      onClick={() => removePurchaseItem(item.id)}
                      className="text-red-600 hover:text-red-800 transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Ingredient Search */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={item.ingredientName || searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowIngredientDropdown(item.id);
                        }}
                        onFocus={() => setShowIngredientDropdown(item.id)}
                        disabled={!monthStatus.canEdit}
                        className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="Search ingredient..."
                      />
                      <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    
                    {/* Dropdown */}
                    {showIngredientDropdown === item.id && monthStatus.canEdit && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredIngredients.map(ingredient => (
                          <button
                            key={ingredient.id}
                            onClick={() => selectIngredient(item.id, ingredient)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                          >
                            <div className="font-medium text-gray-900">{ingredient.name}</div>
                            <div className="text-sm text-gray-500">
                              Last price: RWF {ingredient.lastPrice.toLocaleString()} per {ingredient.unit}
                            </div>
                          </button>
                        ))}
                        {filteredIngredients.length === 0 && (
                          <div className="px-3 py-2 text-gray-500">No ingredients found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.quantity || ''}
                      onChange={(e) => updatePurchaseItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      disabled={!monthStatus.canEdit}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                    />
                  </div>

                  {/* Unit (Display Only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600">
                      {item.unit || 'Select ingredient first'}
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (RWF)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.unitPrice || ''}
                      onChange={(e) => updatePurchaseItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      disabled={!monthStatus.canEdit}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        !monthStatus.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                    />
                  </div>

                  {/* Total Price (Auto-calculated) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-blue-50 text-blue-900 font-medium">
                      RWF {item.totalPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {monthStatus.canEdit && (
            <div className="mt-6 flex justify-between">
              <button
                onClick={addPurchaseItem}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Item
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Purchase Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">RWF {totalCost.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentMonthInfo.monthName}</div>
              <div className="text-sm text-gray-500">Selected Month</div>
            </div>
          </div>

          {/* Items List */}
          {purchaseItems.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Items to Purchase:</h4>
              <div className="space-y-2">
                {purchaseItems.filter(item => item.ingredientName).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">
                      {item.quantity} {item.unit} of {item.ingredientName}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      RWF {item.totalPrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthStatus.canEdit && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={savePurchase}
                disabled={loading || purchaseItems.length === 0}
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
                    Save Purchase for {currentMonthInfo.monthName}
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

export default PurchaseEntry;