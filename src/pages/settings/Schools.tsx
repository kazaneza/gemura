import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, School, AlertCircle, Check } from 'lucide-react';
import { schoolsAPI } from '../../services/api';

interface SchoolData {
  id: string;
  name: string;
  location: string;
  students: number;
  contact: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const Schools: React.FC = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newSchool, setNewSchool] = useState({
    name: '',
    location: '',
    students: '',
    contact: '',
    active: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load schools from backend
  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await schoolsAPI.getSchools();
      setSchools(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const validateForm = (): boolean => {
    if (!newSchool.name.trim()) {
      setError('School name is required');
      return false;
    }
    if (!newSchool.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!newSchool.students || parseInt(newSchool.students) < 0) {
      setError('Valid number of students is required');
      return false;
    }
    if (!newSchool.contact.trim()) {
      setError('Contact information is required');
      return false;
    }
    return true;
  };

  const handleAddSchool = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const schoolData = {
        name: newSchool.name,
        location: newSchool.location,
        students: parseInt(newSchool.students),
        contact: newSchool.contact,
        active: newSchool.active,
      };

      if (isEditing && editingId) {
        await schoolsAPI.updateSchool(editingId, schoolData);
        showSuccess('School updated successfully');
        setIsEditing(false);
        setEditingId(null);
      } else {
        await schoolsAPI.createSchool(schoolData);
        showSuccess('School added successfully');
      }

      setNewSchool({
        name: '',
        location: '',
        students: '',
        contact: '',
        active: true,
      });
      
      await loadSchools();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save school');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchool = (school: SchoolData) => {
    setNewSchool({
      name: school.name,
      location: school.location,
      students: school.students.toString(),
      contact: school.contact,
      active: school.active,
    });
    setIsEditing(true);
    setEditingId(school.id);
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await schoolsAPI.deleteSchool(id);
      await loadSchools();
      showSuccess('School deleted successfully');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete school');
    } finally {
      setLoading(false);
    }
  };

  const toggleSchoolStatus = async (id: string) => {
    const school = schools.find(s => s.id === id);
    if (!school) return;

    try {
      setLoading(true);
      await schoolsAPI.updateSchool(id, { active: !school.active });
      await loadSchools();
      showSuccess(`School ${!school.active ? 'activated' : 'deactivated'} successfully`);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update school status');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewSchool({
      name: '',
      location: '',
      students: '',
      contact: '',
      active: true,
    });
    setError(null);
  };

  if (loading && schools.length === 0) {
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
            Schools Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage schools in your kitchen network
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

      {/* Add/Edit School Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit School' : 'Add New School'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
              <input
                type="text"
                value={newSchool.name}
                onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter school name"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={newSchool.location}
                onChange={(e) => setNewSchool({ ...newSchool, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter school location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Students</label>
              <input
                type="number"
                min="0"
                value={newSchool.students}
                onChange={(e) => setNewSchool({ ...newSchool, students: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
              <input
                type="text"
                value={newSchool.contact}
                onChange={(e) => setNewSchool({ ...newSchool, contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Email or phone number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSchool.active}
                  onChange={(e) => setNewSchool({ ...newSchool, active: e.target.checked })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active School</span>
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
              onClick={handleAddSchool}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (isEditing ? 'Update School' : 'Add School')}
            </button>
          </div>
        </div>
      </div>

      {/* Schools List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Schools ({schools.length})</h3>
        </div>
        <div className="p-6">
          {schools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No schools added yet. Add your first school above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schools.map((school) => (
                <div
                  key={school.id}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    school.active 
                      ? 'border-green-200 bg-green-50 hover:shadow-md' 
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        school.active ? 'bg-red-100' : 'bg-gray-200'
                      }`}>
                        <School className={`h-5 w-5 ${school.active ? 'text-red-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="ml-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          school.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {school.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditSchool(school)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchool(school.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{school.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{school.location}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Students:</span>
                      <span className="font-medium text-gray-900">{school.students.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Contact:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{school.contact}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => toggleSchoolStatus(school.id)}
                      disabled={loading}
                      className={`w-full text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200 disabled:opacity-50 ${
                        school.active
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {loading ? 'Updating...' : (school.active ? 'Deactivate' : 'Activate')}
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

export default Schools;