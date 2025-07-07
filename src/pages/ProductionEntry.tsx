import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

interface Hospital {
  id: string;
  name: string;
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

const ProductionEntry: React.FC = () => {
  const { user } = useAuth();
  const [activeHospitals, setActiveHospitals] = useState<Hospital[]>([]);
  const [hospitalProductions, setHospitalProductions] = useState<HospitalProduction[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const data = await api.get('/hospitals');
      const active = data.filter((hospital: Hospital) => hospital.active);
      setActiveHospitals(active);
    } catch (err: any) {
      setError('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const initializeHospitalProductions = () => {
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

  useEffect(() => {
    loadHospitals();
  }, []);

  useEffect(() => {
    if (activeHospitals.length > 0) {
      initializeHospitalProductions();
    }
  }, [activeHospitals]);

  const handleProductionChange = (hospitalId: string, field: keyof HospitalProduction, value: number) => {
    setHospitalProductions(prev => 
      prev.map(production => 
        production.hospitalId === hospitalId 
          ? { ...production, [field]: value }
          : production
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/production', { productions: hospitalProductions });
      setError('');
      // Reset form or show success message
    } catch (err: any) {
      setError('Failed to save production data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && activeHospitals.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading hospitals...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Production Entry</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {hospitalProductions.map(hospital => (
              <div key={hospital.hospitalId} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  {hospital.hospitalName}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Starch Produced (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={hospital.starchProduced}
                      onChange={(e) => handleProductionChange(
                        hospital.hospitalId, 
                        'starchProduced', 
                        parseFloat(e.target.value) || 0
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vegetables Produced (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={hospital.vegetablesProduced}
                      onChange={(e) => handleProductionChange(
                        hospital.hospitalId, 
                        'vegetablesProduced', 
                        parseFloat(e.target.value) || 0
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAX (People Served)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={hospital.pax}
                      onChange={(e) => handleProductionChange(
                        hospital.hospitalId, 
                        'pax', 
                        parseInt(e.target.value) || 0
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-sm font-medium text-gray-600">Total Production: </span>
                    <span className="text-lg font-semibold text-gray-800">
                      {(hospital.starchProduced + hospital.vegetablesProduced).toFixed(1)} kg
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-sm font-medium text-gray-600">Meals Calculated: </span>
                    <span className="text-lg font-semibold text-gray-800">
                      {hospital.mealsCalculated}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => initializeHospitalProductions()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Production Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionEntry;