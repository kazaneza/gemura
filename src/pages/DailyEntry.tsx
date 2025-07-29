import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Calendar, Users, DollarSign, Calculator, AlertCircle, Check, X } from 'lucide-react';
import { purchasesAPI, productionAPI, hospitalsAPI, ingredientsAPI, indirectCostsAPI } from '../services/api';
import MonthSelector from '../components/MonthSelector';
import { generateAvailableMonths, getCurrentMonth, getMonthId, parseMonthId } from '../utils/monthlySystem';

interface PurchaseItem {
  id?: string;
  ingredientId: string;
  ingredientName: string;
  service: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface ProductionEntry {
  id?: string;
  hospitalId: string;
  hospitalName: string;
  service: string;
  patientsServed: number;
}

interface Hospital {
  id: string;
  name: string;
  location: string;
  patientCapacity: number;
  contact: string;
  active: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  lastPrice: number;
}

const DailyEntry: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(getCurrentMonth()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);

  // Reference data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Existing entries for the selected month
  const [existingEntries, setExistingEntries] = useState<any[]>([]);
  const [totalMealsForMonth, setTotalMealsForMonth] = useState(0);
  const [overheadPerMeal, setOverheadPerMeal] = useState(65.7);

  const availableMonths = generateAvailableMonths();
  const currentMonthInfo = parseMonthId(selectedMonth);

  const services = ['BREAKFAST', 'LUNCH', 'DINNER'];

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadExistingEntries();
    loadMonthlyMeals();
    loadLastMonthOverhead();
  }, [selectedMonth]);

  useEffect(() => {
    loadExistingEntries();
  }, [selectedDate]);

  const loadReferenceData = async () => {
    try {
      const [hospitalsData, ingredientsData] = await Promise.all([
        hospitalsAPI.getHospitals(),
        ingredientsAPI.getIngredients()
      ]);
      setHospitals(hospitalsData.filter((h: Hospital) => h.active));
      setIngredients(ingredientsData);
    } catch (err: any) {
      console.error('Failed to load reference data:', err);
      setError('Failed to load hospitals and ingredients');
    }
  };

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

  const loadLastMonthOverhead = async () => {
    try {
      const monthInfo = parseMonthId(selectedMonth);
      const lastMonth = new Date(monthInfo.year, monthInfo.month - 2, 1);
      
      const indirectCosts = await indirectCostsAPI.getIndirectCosts({
        year: lastMonth.getMonth() === 11 ? lastMonth.getFullYear() + 1 : lastMonth.getFullYear(),
        month: lastMonth.getMonth() === 11 ? 1 : lastMonth.getMonth() + 2
      });
      
      const totalOverheadPerMeal = indirectCosts.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
      setOverheadPerMeal(Math.round(totalOverheadPerMeal * 100) / 100);
      
    } catch (err: any) {
      console.error('Failed to load last month overhead:', err);
      setOverheadPerMeal(0);
    }
  };

  const loadExistingEntries = async () => {
    try {
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

      const entries = [];

      purchases.forEach((purchase: any) => {
        entries.push({
          type: 'purchase',
          id: purchase.id,
          service: purchase.service,
          description: `${purchase.ingredient?.name} - ${purchase.quantity} ${purchase.ingredient?.unit}`,
          amount: purchase.totalPrice,
          data: purchase
        });
      });

      productions.forEach((production: any) => {
        entries.push({
          type: 'production',
          id: production.id,
          service: production.service,
          description: `${production.hospital?.name} - ${production.patientsServed} patients`,
          amount: production.patientsServed,
          data: production
        });
      });

      setExistingEntries(entries);
    } catch (err: any) {
      console.error('Failed to load existing entries:', err);
      setError('Failed to load existing entries');
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, {
      ingredientId: '',
      ingredientName: '',
      service: 'LUNCH',
      quantity: 0,
      unit: '',
      unitPrice: 0,
      totalPrice: 0
    }]);
  };

  const updatePurchaseItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'ingredientId') {
      const ingredient = ingredients.find(ing => ing.id === value);
      if (ingredient) {
        updatedItems[index].ingredientName = ingredient.name;
        updatedItems[index].unit = ingredient.unit;
        updatedItems[index].unitPrice = ingredient.lastPrice;
        updatedItems[index].totalPrice = updatedItems[index].quantity * ingredient.lastPrice;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setPurchaseItems(updatedItems);
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const addProductionEntry = () => {
    setProductionEntries([...productionEntries, {
      hospitalId: '',
      hospitalName: '',
      service: 'LUNCH',
      patientsServed: 0
    }]);
  };

  const updateProductionEntry = (index: number, field: keyof ProductionEntry, value: any) => {
    const updatedEntries = [...productionEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };

    if (field === 'hospitalId') {
      const hospital = hospitals.find(h => h.id === value);
      if (hospital) {
        updatedEntries[index].hospitalName = hospital.name;
      }
    }

    setProductionEntries(updatedEntries);
  };

  const removeProductionEntry = (index: number) => {
    setProductionEntries(productionEntries.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (purchaseItems.length === 0 && productionEntries.length === 0) {
      setError('Please add at least one purchase or production entry');
      return false;
    }

    for (const item of purchaseItems) {
      if (!item.ingredientId || item.quantity <= 0 || item.unitPrice <= 0) {
        setError('Please complete all purchase item fields with valid values');
        return false;
      }
    }

    for (const entry of productionEntries) {
      if (!entry.hospitalId || entry.patientsServed <= 0) {
        setError('Please complete all production entry fields with valid values');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const purchasePromises = purchaseItems.map(item =>
        purchasesAPI.createPurchase({
          ingredientId: item.ingredientId,
          service: item.service,
          purchaseDate: new Date(selectedDate).toISOString(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })
      );

      const productionPromises = productionEntries.map(entry =>
        productionAPI.createProduction({
          hospitalId: entry.hospitalId,
          service: entry.service,
          productionDate: new Date(selectedDate).toISOString(),
          patientsServed: entry.patientsServed
        })
      );

      await Promise.all([...purchasePromises, ...productionPromises]);

      setPurchaseItems([]);
      setProductionEntries([]);
      await loadExistingEntries();
      await loadMonthlyMeals();
      
      showSuccess('Entries saved successfully');
      setError(null);
    } catch (err: any) {
      console.error('Failed to save entries:', err);
      setError(err.response?.data?.detail || 'Failed to save entries');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string, entryType: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      setLoading(true);
      
      if (entryType === 'purchase') {
        await purchasesAPI.deletePurchase(entryId);
      } else {
        await productionAPI.deleteProduction(entryId);
      }

      await loadExistingEntries();
      await loadMonthlyMeals();
      showSuccess('Entry deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily summary using weighted averages (consistent with reports)
  const dailySummary = {
    totalIngredientCost: purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0),
    totalMeals: productionEntries.reduce((sum, entry) => sum + entry.patientsServed, 0),
    totalOverheadCost: 0,
    weightedAverageCPM: 0
  };

  if (dailySummary.totalMeals > 0) {
    dailySummary.totalOverheadCost = dailySummary.totalMeals * overheadPerMeal;
    // Weighted average CPM = (Total Ingredient Cost + Total Overhead Cost) ÷ Total Meals
    dailySummary.weightedAverageCPM = (dailySummary.totalIngredientCost + dailySummary.totalOverheadCost) / dailySummary.totalMeals;
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Daily Entry - {currentMonthInfo.monthName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Record daily purchases and production for {new Date(selectedDate).toLocaleDateString()}
          </p>
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

      {/* Month Selection */}
      <MonthSelector
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Date Selection */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-red-600" />
            Select Date in {currentMonthInfo.monthName}
          </h3>
        </div>
        <div className="p-6">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Daily Summary for {currentMonthInfo.monthName}</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-blue-900">RWF {dailySummary.totalIngredientCost.toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Ingredient Cost</div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-green-900">{dailySummary.totalMeals.toLocaleString()}</div>
                  <div className="text-sm text-green-700">Total Meals</div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-purple-900">RWF {Math.round(dailySummary.totalOverheadCost).toLocaleString()}</div>
                  <div className="text-sm text-purple-700">Total Overhead</div>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-red-900">RWF {Math.round(dailySummary.weightedAverageCPM).toLocaleString()}</div>
                  <div className="text-sm text-red-700">Weighted Avg CPM</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Calculation:</strong> (RWF {dailySummary.totalIngredientCost.toLocaleString()} + RWF {Math.round(dailySummary.totalOverheadCost).toLocaleString()}) ÷ {dailySummary.totalMeals} meals = RWF {Math.round(dailySummary.weightedAverageCPM).toLocaleString()}
              </div>
              <div>
                <strong>Overhead per meal:</strong> RWF {overheadPerMeal.toLocaleString()} (from previous month)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Items Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Ingredient Purchases</h3>
        </div>
        <div className="p-6">
          {purchaseItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient</label>
                <select
                  value={item.ingredientId}
                  onChange={(e) => updatePurchaseItem(index, 'ingredientId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select ingredient</option>
                  {ingredients.map(ingredient => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  value={item.service}
                  onChange={(e) => updatePurchaseItem(index, 'service', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {services.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  value={item.quantity || ''}
                  onChange={(e) => updatePurchaseItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={item.unit}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input
                  type="number"
                  step="1"
                  value={item.unitPrice || ''}
                  onChange={(e) => updatePurchaseItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                <input
                  type="number"
                  value={item.totalPrice}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => removePurchaseItem(index)}
                  className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addPurchaseItem}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Purchase Item
          </button>
        </div>
      </div>

      {/* Production Entries Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Food Production</h3>
        </div>
        <div className="p-6">
          {productionEntries.map((entry, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                <select
                  value={entry.hospitalId}
                  onChange={(e) => updateProductionEntry(index, 'hospitalId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select hospital</option>
                  {hospitals.map(hospital => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  value={entry.service}
                  onChange={(e) => updateProductionEntry(index, 'service', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {services.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patients Served</label>
                <input
                  type="number"
                  value={entry.patientsServed || ''}
                  onChange={(e) => updateProductionEntry(index, 'patientsServed', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => removeProductionEntry(index)}
                  className="p-2 text-red-600 hover:text-red-800 transition-colors duration-200"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addProductionEntry}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Production Entry
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || (purchaseItems.length === 0 && productionEntries.length === 0)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Saving...' : 'Save Entries'}
        </button>
      </div>

      {/* Existing Entries for Selected Date */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Existing Entries for {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>
        <div className="p-6">
          {existingEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No entries found for this date in {currentMonthInfo.monthName}
            </div>
          ) : (
            <div className="space-y-3">
              {existingEntries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.type === 'purchase' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.type === 'purchase' ? 'Purchase' : 'Production'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {entry.service}
                    </span>
                    <span className="text-sm text-gray-900">{entry.description}</span>
                    {entry.type === 'purchase' && (
                      <span className="text-sm font-medium text-green-600">RWF {entry.amount.toLocaleString()}</span>
                    )}
                    {entry.type === 'production' && (
                      <span className="text-sm font-medium text-blue-600">{entry.amount} patients</span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id, entry.type)}
                    disabled={loading}
                    className="p-1 text-red-600 hover:text-red-800 transition-colors duration-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyEntry;