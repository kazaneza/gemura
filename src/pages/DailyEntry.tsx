import React, { useState, useEffect } from 'react';
import { Save, Check, X, Calendar, AlertCircle, Calculator, Edit2, Eye, Trash2, Coffee, Utensils, Moon } from 'lucide-react';
import { hospitalsAPI, ingredientsAPI, purchasesAPI, productionAPI } from '../services/api';

enum MealService {
  BREAKFAST = "BREAKFAST",
  LUNCH = "LUNCH",
  DINNER = "DINNER"
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  lastPrice: number;
}

interface Hospital {
  id: string;
  name: string;
  location: string;
  beds: number;
  active: boolean;
}

interface IngredientEntry {
  id: string;
  ingredientId: string;
  ingredientName: string;
  service: MealService;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface HospitalEntry {
  id: string;
  hospitalId: string;
  hospitalName: string;
  service: MealService;
  patientsServed: number;
}

interface ExistingEntry {
  date: string;
  purchases: any[];
  productions: any[];
  totalCost: number;
  totalMeals: number;
  costPerMeal: number;
  overhead: number;
  totalCPM: number;
}

const DailyEntry: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedService, setSelectedService] = useState<MealService>(MealService.BREAKFAST);
  const [overheadPercentage, setOverheadPercentage] = useState(15);
  
  // Changed to store entries by service
  const [ingredientEntries, setIngredientEntries] = useState<{ [service: string]: { [key: string]: IngredientEntry } }>({
    [MealService.BREAKFAST]: {},
    [MealService.LUNCH]: {},
    [MealService.DINNER]: {}
  });
  const [hospitalEntries, setHospitalEntries] = useState<{ [service: string]: { [key: string]: HospitalEntry } }>({
    [MealService.BREAKFAST]: {},
    [MealService.LUNCH]: {},
    [MealService.DINNER]: {}
  });
  
  const [existingEntries, setExistingEntries] = useState<ExistingEntry[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showExistingEntries, setShowExistingEntries] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadExistingEntries();
  }, []);

  // Initialize with one empty item
  useEffect(() => {
    if (ingredients.length > 0) {
      const initialIngredientEntries: { [service: string]: { [key: string]: IngredientEntry } } = {
        [MealService.BREAKFAST]: {},
        [MealService.LUNCH]: {},
        [MealService.DINNER]: {}
      };
      
      Object.keys(initialIngredientEntries).forEach(service => {
        ingredients.forEach(ingredient => {
          initialIngredientEntries[service as MealService][ingredient.id] = {
            id: ingredient.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            service: service as MealService,
            unit: ingredient.unit,
            quantity: 0,
            unitPrice: ingredient.lastPrice,
            totalPrice: 0,
          };
        });
      });
      
      setIngredientEntries(initialIngredientEntries);
    }
  }, [ingredients]);

  useEffect(() => {
    if (hospitals.length > 0) {
      const initialHospitalEntries: { [service: string]: { [key: string]: HospitalEntry } } = {
        [MealService.BREAKFAST]: {},
        [MealService.LUNCH]: {},
        [MealService.DINNER]: {}
      };
      
      Object.keys(initialHospitalEntries).forEach(service => {
        hospitals.forEach(hospital => {
          initialHospitalEntries[service as MealService][hospital.id] = {
            id: hospital.id,
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            service: service as MealService,
            patientsServed: 0
          };
        });
      });
      
      setHospitalEntries(initialHospitalEntries);
    }
  }, [hospitals]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load ingredients first
      const ingredientsData = await ingredientsAPI.getIngredients();
      setIngredients(ingredientsData);
      
      // Then load hospitals
      const hospitalsData = await hospitalsAPI.getHospitals();
      setHospitals(hospitalsData.filter((hospital: Hospital) => hospital.active));
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load initial data. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingEntries = async () => {
    try {
      // Get last 7 days of entries
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

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

      // Group by date
      const entriesByDate: { [key: string]: ExistingEntry } = {};

      purchases.forEach((purchase: any) => {
        const date = new Date(purchase.purchaseDate).toISOString().split('T')[0];
        if (!entriesByDate[date]) {
          entriesByDate[date] = {
            date,
            purchases: [],
            productions: [],
            totalCost: 0,
            totalMeals: 0,
            costPerMeal: 0,
            overhead: 0,
            totalCPM: 0
          };
        }
        entriesByDate[date].purchases.push(purchase);
        entriesByDate[date].totalCost += purchase.totalPrice;
      });

      productions.forEach((production: any) => {
        const date = new Date(production.productionDate).toISOString().split('T')[0];
        if (!entriesByDate[date]) {
          entriesByDate[date] = {
            date,
            purchases: [],
            productions: [],
            totalCost: 0,
            totalMeals: 0,
            costPerMeal: 0,
            overhead: 0,
            totalCPM: 0
          };
        }
        entriesByDate[date].productions.push(production);
        // Use patientsServed instead of beneficiaries
        entriesByDate[date].totalMeals += production.patientsServed;
      });

      // Calculate metrics for each day using same logic as Daily Entry
      Object.values(entriesByDate).forEach(entry => {
        if (entry.totalMeals > 0) {
          entry.costPerMeal = entry.totalCost / entry.totalMeals;
          entry.overhead = entry.costPerMeal * (overheadPercentage / 100);
          entry.totalCPM = entry.costPerMeal + entry.overhead;
        }
      });

      setExistingEntries(Object.values(entriesByDate).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));

    } catch (err: any) {
      console.error('Failed to load existing entries:', err);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Load existing entry for editing
  const loadEntryForEditing = async (date: string) => {
    try {
      setLoading(true);
      const startDate = new Date(date);
      const endDate = new Date(date);
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

      // Reset entries
      const resetIngredientEntries: { [service: string]: { [key: string]: IngredientEntry } } = {
        [MealService.BREAKFAST]: {},
        [MealService.LUNCH]: {},
        [MealService.DINNER]: {}
      };
      
      Object.keys(resetIngredientEntries).forEach(service => {
        ingredients.forEach(ingredient => {
          resetIngredientEntries[service as MealService][ingredient.id] = {
            id: ingredient.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            service: service as MealService,
            unit: ingredient.unit,
            quantity: 0,
            unitPrice: ingredient.lastPrice,
            totalPrice: 0,
          };
        });
      });

      const resetHospitalEntries: { [service: string]: { [key: string]: HospitalEntry } } = {
        [MealService.BREAKFAST]: {},
        [MealService.LUNCH]: {},
        [MealService.DINNER]: {}
      };
      
      Object.keys(resetHospitalEntries).forEach(service => {
        hospitals.forEach(hospital => {
          resetHospitalEntries[service as MealService][hospital.id] = {
            id: hospital.id,
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            service: service as MealService,
            patientsServed: 0
          };
        });
      });

      // Load purchase data
      purchases.forEach((purchase: any) => {
        if (purchase.service && resetIngredientEntries[purchase.service][purchase.ingredientId]) {
          resetIngredientEntries[purchase.service][purchase.ingredientId] = {
            ...resetIngredientEntries[purchase.service][purchase.ingredientId],
            quantity: purchase.quantity,
            unitPrice: purchase.unitPrice,
            totalPrice: purchase.totalPrice
          };
        }
      });

      // Load production data
      productions.forEach((production: any) => {
        if (production.service && resetHospitalEntries[production.service][production.hospitalId]) {
          resetHospitalEntries[production.service][production.hospitalId] = {
            ...resetHospitalEntries[production.service][production.hospitalId],
            patientsServed: production.patientsServed
          };
        }
      });

      setIngredientEntries(resetIngredientEntries);
      setHospitalEntries(resetHospitalEntries);
      setSelectedDate(date);
      setEditingDate(date);

    } catch (err: any) {
      setError('Failed to load entry for editing');
    } finally {
      setLoading(false);
    }
  };

  // Delete existing entry
  const deleteEntry = async (date: string) => {
    if (!confirm(`Are you sure you want to delete all data for ${new Date(date).toLocaleDateString()}?`)) {
      return;
    }

    try {
      setLoading(true);
      const startDate = new Date(date);
      const endDate = new Date(date);
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

      // Delete all purchases and productions for this date
      await Promise.all([
        ...purchases.map((p: any) => purchasesAPI.deletePurchase(p.id)),
        ...productions.map((p: any) => productionAPI.deleteProduction(p.id))
      ]);

      await loadExistingEntries();
      showSuccess('Entry deleted successfully');

    } catch (err: any) {
      setError('Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  // Update ingredient entry
  const updateIngredientEntry = (service: MealService, ingredientId: string, field: keyof IngredientEntry, value: any) => {
    setIngredientEntries(entries => {
      const updatedEntry = { ...entries[service][ingredientId], [field]: value };
      
      // Auto-calculate total price
      if (field === 'quantity' || field === 'unitPrice') {
        updatedEntry.totalPrice = updatedEntry.quantity * updatedEntry.unitPrice;
      }
      
      return {
        ...entries,
        [service]: {
          ...entries[service],
          [ingredientId]: updatedEntry
        }
      };
    });
  };

  // Update hospital entry
  const updateHospitalEntry = (service: MealService, hospitalId: string, field: keyof HospitalEntry, value: any) => {
    setHospitalEntries(entries => {
      const updatedEntry = { ...entries[service][hospitalId], [field]: value };
      
      return {
        ...entries,
        [service]: {
          ...entries[service],
          [hospitalId]: updatedEntry
        }
      };
    });
  };

  // Calculations for the selected service
  const calculations = {
    totalIngredientCost: Object.values(ingredientEntries[selectedService] || {}).reduce((sum, entry) => sum + entry.totalPrice, 0),
    totalPatientsServed: Object.values(hospitalEntries[selectedService] || {}).reduce((sum, entry) => sum + entry.patientsServed, 0),
    get costPerMeal() {
      return this.totalPatientsServed > 0 ? this.totalIngredientCost / this.totalPatientsServed : 0;
    },
    get overhead() {
      return this.costPerMeal * (overheadPercentage / 100);
    },
    get totalCostPerMeal() {
      return this.costPerMeal + this.overhead;
    }
  };

  // Validation
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!selectedDate) {
      errors.push('Please select a date');
    }

    const validIngredients = Object.values(ingredientEntries[selectedService] || {}).filter(entry => 
      entry.quantity > 0 && entry.unitPrice > 0
    );
    
    const validHospitals = Object.values(hospitalEntries[selectedService] || {}).filter(entry => 
      entry.patientsServed > 0
    );

    if (validIngredients.length === 0) {
      errors.push('At least one ingredient with quantity and price is required');
    }

    if (validHospitals.length === 0) {
      errors.push('At least one hospital with production data and pax is required');
    }

    // Validate individual entries
    Object.values(ingredientEntries[selectedService] || {}).forEach((entry) => {
      if (entry.quantity > 0) {
        if (entry.unitPrice <= 0) {
          errors.push(`${entry.ingredientName}: Unit price must be greater than 0`);
        }
      }
      if (entry.quantity < 0) {
        errors.push(`${entry.ingredientName}: Quantity cannot be negative`);
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save all data
  const saveAllData = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If editing, delete existing data first
      if (editingDate) {
        const startDate = new Date(editingDate);
        const endDate = new Date(editingDate);
        endDate.setDate(endDate.getDate() + 1);

        const [existingPurchases, existingProductions] = await Promise.all([
          purchasesAPI.getPurchases({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          }),
          productionAPI.getProductions({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          })
        ]);

        await Promise.all([
          ...existingPurchases.map((p: any) => purchasesAPI.deletePurchase(p.id)),
          ...existingProductions.map((p: any) => productionAPI.deleteProduction(p.id))
        ]);
      }

      // Save purchases (only for ingredients with quantity > 0)
      const validIngredients = Object.values(ingredientEntries[selectedService] || {}).filter(entry => 
        entry.quantity > 0 && entry.unitPrice > 0
      );

      for (const ingredient of validIngredients) {
        const purchaseData = {
          ingredientId: ingredient.ingredientId,
          service: selectedService,
          purchaseDate: new Date(selectedDate).toISOString(),
          quantity: ingredient.quantity,
          unitPrice: ingredient.unitPrice,
          totalPrice: ingredient.totalPrice,
          weekId: 'temp-week-id'
        };
        await purchasesAPI.createPurchase(purchaseData);
      }

      // Save productions (only for hospitals with production data)
      const validHospitals = Object.values(hospitalEntries[selectedService] || {}).filter(entry => 
        entry.patientsServed > 0
      );

      for (const hospital of validHospitals) {
        const productionData = {
          hospitalId: hospital.hospitalId,
          service: selectedService,
          productionDate: new Date(selectedDate).toISOString(),
          patientsServed: hospital.patientsServed,
          weekId: 'temp-week-id'
        };
        await productionAPI.createProduction(productionData);
      }

      // Reset form to zeros
      const resetIngredientEntries: { [service: string]: { [key: string]: IngredientEntry } } = {
        [MealService.BREAKFAST]: {},
        [MealService.LUNCH]: {},
        [MealService.DINNER]: {}
      };
      
      Object.keys(resetIngredientEntries).forEach(service => {
        ingredients.forEach(ingredient => {
          resetIngredientEntries[service as MealService][ingredient.id] = {
            id: ingredient.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            service: service as MealService,
            unit: ingredient.unit,
            quantity: 0,
            unitPrice: ingredient.lastPrice,
            totalPrice: 0,
          };
        });
      });
      
      setIngredientEntries(resetIngredientEntries);

      const resetHospitalEntries: { [service: string]: { [key: string]: HospitalEntry } } = {
        [MealService.BREAKFAST]: {},
        [MealService.LUNCH]: {},
        [MealService.DINNER]: {}
      };
      
      Object.keys(resetHospitalEntries).forEach(service => {
        hospitals.forEach(hospital => {
          resetHospitalEntries[service as MealService][hospital.id] = {
            id: hospital.id,
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            service: service as MealService,
            patientsServed: 0
          };
        });
      });
      
      setHospitalEntries(resetHospitalEntries);

      setValidationErrors([]);
      setEditingDate(null);
      await loadExistingEntries();
      showSuccess(editingDate ? 'Daily entry updated successfully!' : 'Daily entry saved successfully!');

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save daily entry');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    
    // Reset to empty form
    const resetIngredientEntries: { [service: string]: { [key: string]: IngredientEntry } } = {
      [MealService.BREAKFAST]: {},
      [MealService.LUNCH]: {},
      [MealService.DINNER]: {}
    };
    
    Object.keys(resetIngredientEntries).forEach(service => {
      ingredients.forEach(ingredient => {
        resetIngredientEntries[service as MealService][ingredient.id] = {
          id: ingredient.id,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          service: service as MealService,
          unit: ingredient.unit,
          quantity: 0,
          unitPrice: ingredient.lastPrice,
          totalPrice: 0,
        };
      });
    });
    
    setIngredientEntries(resetIngredientEntries);

    const resetHospitalEntries: { [service: string]: { [key: string]: HospitalEntry } } = {
      [MealService.BREAKFAST]: {},
      [MealService.LUNCH]: {},
      [MealService.DINNER]: {}
    };
    
    Object.keys(resetHospitalEntries).forEach(service => {
      hospitals.forEach(hospital => {
        resetHospitalEntries[service as MealService][hospital.id] = {
          id: hospital.id,
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          service: service as MealService,
          patientsServed: 0
        };
      });
    });
    
    setHospitalEntries(resetHospitalEntries);
  };

  // Get service icon
  const getServiceIcon = (service: MealService) => {
    switch (service) {
      case MealService.BREAKFAST:
        return <Coffee className="h-5 w-5" />;
      case MealService.LUNCH:
        return <Utensils className="h-5 w-5" />;
      case MealService.DINNER:
        return <Moon className="h-5 w-5" />;
    }
  };

  // Get service display name
  const getServiceName = (service: MealService) => {
    switch (service) {
      case MealService.BREAKFAST:
        return "Breakfast";
      case MealService.LUNCH:
        return "Lunch";
      case MealService.DINNER:
        return "Dinner";
    }
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Meal Service Entry {editingDate && <span className="text-red-600">- Editing {new Date(editingDate).toLocaleDateString()}</span>}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the quantities for ingredients used and patients served per hospital for each meal service
          </p>
        </div>
        {editingDate && (
          <div className="mt-4 md:mt-0">
            <button
              onClick={cancelEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Edit
            </button>
          </div>
        )}
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

      {/* Recent Entries */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Meal Service Entries (Last 7 Days)</h3>
            <button
              onClick={() => setShowExistingEntries(!showExistingEntries)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showExistingEntries ? 'Hide' : 'Show'} Entries
            </button>
          </div>
        </div>
        {showExistingEntries && (
          <div className="p-6">
            {existingEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent entries found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Meals</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Meal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overhead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total CPM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {existingEntries.map((entry) => (
                      <tr key={entry.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(entry.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RWF {entry.totalCost.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.totalMeals.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RWF {Math.round(entry.costPerMeal).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RWF {Math.round(entry.overhead).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          RWF {Math.round(entry.totalCPM).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => loadEntryForEditing(entry.date)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                              title="Edit entry"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.date)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
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
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 space-y-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-red-600" />
            Entry Date & Service
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Meal Service</label>
              <div className="flex space-x-2">
                {Object.values(MealService).map(service => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => setSelectedService(service)}
                    className={`flex-1 flex items-center justify-center px-4 py-2 border ${
                      selectedService === service 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-red-500`}
                  >
                    {getServiceIcon(service)}
                    <span className="ml-2">{getServiceName(service)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Ingredients for {getServiceName(selectedService)} Service
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Fill in quantities for ingredients used for {getServiceName(selectedService).toLowerCase()} service. Leave empty if not used.
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Unit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Unit Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ingredient) => {
                  const entry = ingredientEntries[selectedService]?.[ingredient.id];
                  if (!entry) return null;
                  
                  return (
                    <tr key={ingredient.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{ingredient.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{ingredient.unit}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.quantity || ''}
                          onChange={(e) => updateIngredientEntry(selectedService, ingredient.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={entry.unitPrice || ''}
                          onChange={(e) => updateIngredientEntry(selectedService, ingredient.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className={`px-3 py-2 rounded-md font-medium ${
                          entry.totalPrice > 0 
                            ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                            : 'bg-gray-50 border border-gray-200 text-gray-600'
                        }`}>
                          RWF {entry.totalPrice.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hospitals Patient Count Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Patients Served for {getServiceName(selectedService)}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Enter the number of patients served at each hospital for {getServiceName(selectedService).toLowerCase()} service.
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Hospital</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Beds</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Patients Served</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((hospital) => {
                  const entry = hospitalEntries[selectedService]?.[hospital.id];
                  if (!entry) return null;
                  
                  const hasData = entry.patientsServed > 0;
                  
                  return (
                    <tr key={hospital.id} className={`border-b border-gray-100 ${hasData ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{hospital.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{hospital.location}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{hospital.beds}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          value={entry.patientsServed || ''}
                          onChange={(e) => updateHospitalEntry(selectedService, hospital.id, 'patientsServed', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cost Calculations */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-red-600" />
            {getServiceName(selectedService)} Service Cost Analysis
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">{getServiceName(selectedService)} Ingredient Cost</div>
              <div className="text-2xl font-bold text-blue-900">
                RWF {calculations.totalIngredientCost.toLocaleString()}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Cost per Meal</div>
              <div className="text-2xl font-bold text-green-900">
                RWF {Math.round(calculations.costPerMeal).toLocaleString()}
              </div>
              <div className="text-xs text-green-700 mt-1">
                Ingredient Cost ÷ Total Patients Served
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-600 font-medium">Overhead ({overheadPercentage}%)</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={overheadPercentage}
                  onChange={(e) => setOverheadPercentage(parseInt(e.target.value) || 15)}
                  className="w-16 px-2 py-1 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                RWF {Math.round(calculations.overhead).toLocaleString()}
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Cost per Meal × {overheadPercentage}%
              </div>
            </div>
          </div>

          <div className="mt-6 bg-red-50 rounded-lg p-6">
            <div className="text-center">
              <div className="text-sm text-red-600 font-medium mb-2">Total Cost per Meal</div>
              <div className="text-4xl font-bold text-red-900">
                RWF {Math.round(calculations.totalCostPerMeal).toLocaleString()}
              </div>
              <div className="text-sm text-red-700 mt-2">
                Cost per Meal + Overhead = RWF {Math.round(calculations.costPerMeal).toLocaleString()} + RWF {Math.round(calculations.overhead).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-medium text-gray-900 mb-2">Summary</div>
              <div className="space-y-1 text-gray-700">
                <div>Total Ingredient Cost: RWF {calculations.totalIngredientCost.toLocaleString()}</div>
                <div>Total Patients Served: {calculations.totalPatientsServed.toLocaleString()}</div>
                <div>Overhead Rate: {overheadPercentage}%</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-medium text-gray-900 mb-2">Calculation Breakdown</div>
              <div className="space-y-1 text-gray-700 text-xs">
                <div>1. Cost per Meal = Ingredient Cost ÷ Total Patients Served</div>
                <div>2. Overhead = Cost per Meal × {overheadPercentage}%</div>
                <div>3. Total CPM = Cost per Meal + Overhead</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveAllData}
              disabled={loading}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingDate ? 'Updating...' : `Saving ${getServiceName(selectedService)} Data...`}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingDate ? `Update ${getServiceName(selectedService)} Entry` : `Save ${getServiceName(selectedService)} Entry`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyEntry;