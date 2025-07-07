import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChefHat, Search, AlertCircle, Check } from 'lucide-react';
import { ingredientsAPI } from '../../services/api';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  lastPrice: number;
  createdAt: string;
  updatedAt: string;
}

const Ingredients: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: '',
    lastPrice: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const units = ['KG', 'LTR', 'PCS'];

  // Load ingredients from backend
  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const data = await ingredientsAPI.getIngredients();
      setIngredients(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.name || !newIngredient.unit || !newIngredient.lastPrice) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      const ingredientData = {
        name: newIngredient.name,
        unit: newIngredient.unit,
        lastPrice: parseFloat(newIngredient.lastPrice),
      };

      if (isEditing && editingId) {
        await ingredientsAPI.updateIngredient(editingId, ingredientData);
        showSuccess('Ingredient updated successfully');
        setIsEditing(false);
        setEditingId(null);
      } else {
        await ingredientsAPI.createIngredient(ingredientData);
        showSuccess('Ingredient added successfully');
      }

      setNewIngredient({ name: '', unit: '', lastPrice: '' });
      await loadIngredients();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save ingredient');
    } finally {
      setLoading(false);
    }
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setNewIngredient({
      name: ingredient.name,
      unit: ingredient.unit,
      lastPrice: ingredient.lastPrice.toString(),
    });
    setIsEditing(true);
    setEditingId(ingredient.id);
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) {
      return;
    }

    try {
      setLoading(true);
      await ingredientsAPI.deleteIngredient(id);
      await loadIngredients();
      showSuccess('Ingredient deleted successfully');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete ingredient');
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = ingredients.filter(ingredient => 
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && ingredients.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Ingredients Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your ingredient list with units and pricing
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

      {/* Search */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
              placeholder="Search ingredients..."
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Ingredient Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient Name</label>
              <input
                type="text"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter ingredient name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select unit</option>
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Price (RWF)</label>
              <input
                type="number"
                step="1"
                value={newIngredient.lastPrice}
                onChange={(e) => setNewIngredient({ ...newIngredient, lastPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  setNewIngredient({ name: '', unit: '', lastPrice: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleAddIngredient}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (isEditing ? 'Update Ingredient' : 'Add Ingredient')}
            </button>
          </div>
        </div>
      </div>

      {/* Ingredients List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Ingredients ({filteredIngredients.length})
          </h3>
        </div>
        <div className="p-6">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No ingredients found matching your search.' : 'No ingredients added yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIngredients.map((ingredient) => (
                    <tr key={ingredient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                            <ChefHat className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {ingredient.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        RWF {ingredient.lastPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditIngredient(ingredient)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(ingredient.id)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200"
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
      </div>
    </div>
  );
};

export default Ingredients;