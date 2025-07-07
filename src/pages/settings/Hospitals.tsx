import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2, AlertCircle, Check } from 'lucide-react';
import { hospitalsAPI } from '../../services/api';

interface HospitalData {
  id: string;
  name: string;
  location: string;
  beds: number;
  contact: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const Hospitals: React.FC = () => {
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newHospital, setNewHospital] = useState({
    name: '',
    location: '',
    beds: '',
    contact: '',
    active: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load hospitals from backend
  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      try {
        const data = await hospitalsAPI.getHospitals();
        setHospitals(data || []);
      } catch (fetchError) {
        console.error('Error fetching hospitals:', fetchError);
        setHospitals([]);
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load hospitals:', err);
      setError('Failed to load hospitals. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const validateForm = (): boolean => {
    if (!newHospital.name.trim()) {
      setError('Hospital name is required');
      return false;
    }
    if (!newHospital.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!newHospital.beds || parseInt(newHospital.beds) < 0) {
      setError('Valid number of beds is required');
      return false;
    }
    if (!newHospital.contact.trim()) {
      setError('Contact information is required');
      return false;
    }
    return true;
  };

  const handleAddHospital = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const hospitalData = {
        name: newHospital.name,
        location: newHospital.location,
        beds: parseInt(newHospital.beds),
        contact: newHospital.contact,
        active: newHospital.active,
      };

      if (isEditing && editingId) {
        await hospitalsAPI.updateHospital(editingId, hospitalData);
        showSuccess('Hospital updated successfully');
        setIsEditing(false);
        setEditingId(null);
      } else {
        await hospitalsAPI.createHospital(hospitalData);
        showSuccess('Hospital added successfully');
      }

      setNewHospital({
        name: '',
        location: '',
        beds: '',
        contact: '',
        active: true,
      });
      
      await loadHospitals();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save hospital');
    } finally {
      setLoading(false);
    }
  };

  const handleEditHospital = (hospital: HospitalData) => {
    setNewHospital({
      name: hospital.name,
      location: hospital.location,
      beds: hospital.beds.toString(),
      contact: hospital.contact,
      active: hospital.active,
    });
    setIsEditing(true);
    setEditingId(hospital.id);
  };

  const handleDeleteHospital = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await hospitalsAPI.deleteHospital(id);
      await loadHospitals();
      showSuccess('Hospital deleted successfully');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete hospital');
    } finally {
      setLoading(false);
    }
  };

  const toggleHospitalStatus = async (id: string) => {
    const hospital = hospitals.find(h => h.id === id);
    if (!hospital) return;

    try {
      setLoading(true);
      await hospitalsAPI.updateHospital(id, { active: !hospital.active });
      await loadHospitals();
      showSuccess(`Hospital ${!hospital.active ? 'activated' : 'deactivated'} successfully`);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update hospital status');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewHospital({
      name: '',
      location: '',
      beds: '',
      contact: '',
      active: true,
    });
    setError(null);
  };

  if (loading && hospitals.length === 0) {
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
            Hospitals Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage hospitals in your kitchen network
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

      {/* Add/Edit Hospital Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit Hospital' : 'Add New Hospital'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
              <input
                type="text"
                value={newHospital.name}
                onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter hospital name"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={newHospital.location}
                onChange={(e) => setNewHospital({ ...newHospital, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter hospital location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Beds</label>
              <input
                type="number"
                min="0"
                value={newHospital.beds}
                onChange={(e) => setNewHospital({ ...newHospital, beds: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
              <input
                type="text"
                value={newHospital.contact}
                onChange={(e) => setNewHospital({ ...newHospital, contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Email or phone number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newHospital.active}
                  onChange={(e) => setNewHospital({ ...newHospital, active: e.target.checked })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active Hospital</span>
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            {isEditing && (
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleAddHospital}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (isEditing ? 'Update Hospital' : 'Add Hospital')}
            </button>
          </div>
        </div>
      </div>

      {/* Hospitals List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Hospitals ({hospitals.length})</h3>
        </div>
        <div className="p-6">
          {hospitals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hospitals added yet. Add your first hospital above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    hospital.active 
                      ? 'border-green-200 bg-green-50 hover:shadow-md' 
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        hospital.active ? 'bg-red-100' : 'bg-gray-200'
                      }`}>
                        <Building2 className={`h-5 w-5 ${hospital.active ? 'text-red-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="ml-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          hospital.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {hospital.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditHospital(hospital)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHospital(hospital.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{hospital.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{hospital.location}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Beds:</span>
                      <span className="font-medium text-gray-900">{hospital.beds.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Contact:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{hospital.contact}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => toggleHospitalStatus(hospital.id)}
                      disabled={loading}
                      className={`w-full text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200 disabled:opacity-50 ${
                        hospital.active
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {loading ? 'Updating...' : (hospital.active ? 'Deactivate' : 'Activate')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hospitals;