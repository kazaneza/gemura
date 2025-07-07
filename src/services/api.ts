// API service for backend communication
import axios from 'axios';

// ✅ FIXED: Use the correct backend domain that matches your Railway deployment
const API_BASE_URL = 'http://102.37.150.125:8000/api';

// Add some debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kitchen_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kitchen_token');
      localStorage.removeItem('kitchen_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async () => {
    const response = await api.get('/users/');
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  
  updateProfile: async (data: any) => {
    const response = await api.put('/users/me', data);
    return response.data;
  },
  
  createUser: async (userData: any) => {
    const response = await api.post('/users/', userData);
    return response.data;
  },
  
  updateUser: async (userId: string, data: any) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },
  
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

// Schools API
export const schoolsAPI = {
  getSchools: async () => {
    const response = await api.get('/schools/');
    return response.data;
  },
  
  getSchool: async (schoolId: string) => {
    const response = await api.get(`/schools/${schoolId}`);
    return response.data;
  },
  
  createSchool: async (schoolData: any) => {
    const response = await api.post('/schools/', schoolData);
    return response.data;
  },
  
  updateSchool: async (schoolId: string, data: any) => {
    const response = await api.put(`/schools/${schoolId}`, data);
    return response.data;
  },
  
  deleteSchool: async (schoolId: string) => {
    const response = await api.delete(`/schools/${schoolId}`);
    return response.data;
  },
};

// Ingredients API
export const ingredientsAPI = {
  getIngredients: async () => {
    const response = await api.get('/ingredients/');
    return response.data;
  },
  
  getIngredient: async (ingredientId: string) => {
    const response = await api.get(`/ingredients/${ingredientId}`);
    return response.data;
  },
  
  createIngredient: async (ingredientData: any) => {
    const response = await api.post('/ingredients/', ingredientData);
    return response.data;
  },
  
  updateIngredient: async (ingredientId: string, data: any) => {
    const response = await api.put(`/ingredients/${ingredientId}`, data);
    return response.data;
  },
  
  deleteIngredient: async (ingredientId: string) => {
    const response = await api.delete(`/ingredients/${ingredientId}`);
    return response.data;
  },
};

// Purchases API
export const purchasesAPI = {
  getPurchases: async (params?: { week_id?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get('/purchases/', { params });
    return response.data;
  },
  
  getPurchase: async (purchaseId: string) => {
    const response = await api.get(`/purchases/${purchaseId}`);
    return response.data;
  },
  
  createPurchase: async (purchaseData: any) => {
    const response = await api.post('/purchases/', purchaseData);
    return response.data;
  },
  
  updatePurchase: async (purchaseId: string, data: any) => {
    const response = await api.put(`/purchases/${purchaseId}`, data);
    return response.data;
  },
  
  deletePurchase: async (purchaseId: string) => {
    const response = await api.delete(`/purchases/${purchaseId}`);
    return response.data;
  },
};

// Production API
export const productionAPI = {
  getProductions: async (params?: { week_id?: string; school_id?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get('/production/', { params });
    return response.data;
  },
  
  getProduction: async (productionId: string) => {
    const response = await api.get(`/production/${productionId}`);
    return response.data;
  },
  
  createProduction: async (productionData: any) => {
    const response = await api.post('/production/', productionData);
    return response.data;
  },
  
  updateProduction: async (productionId: string, data: any) => {
    const response = await api.put(`/production/${productionId}`, data);
    return response.data;
  },
  
  deleteProduction: async (productionId: string) => {
    const response = await api.delete(`/production/${productionId}`);
    return response.data;
  },
};

// Weeks API
export const weeksAPI = {
  getWeeks: async (params?: { year?: number; month?: number }) => {
    const response = await api.get('/weeks/', { params });
    return response.data;
  },
  
  getWeek: async (weekId: string) => {
    const response = await api.get(`/weeks/${weekId}`);
    return response.data;
  },
  
  createWeek: async (weekData: any) => {
    const response = await api.post('/weeks/', weekData);
    return response.data;
  },
  
  updateWeek: async (weekId: string, data: any) => {
    const response = await api.put(`/weeks/${weekId}`, data);
    return response.data;
  },
  
  deleteWeek: async (weekId: string) => {
    const response = await api.delete(`/weeks/${weekId}`);
    return response.data;
  },
};

// Indirect Costs API
export const indirectCostsAPI = {
  getIndirectCosts: async (params?: { year?: number; month?: number }) => {
    const response = await api.get('/indirect-costs/', { params });
    return response.data;
  },
  
  getIndirectCost: async (costId: string) => {
    const response = await api.get(`/indirect-costs/${costId}`);
    return response.data;
  },
  
  createIndirectCost: async (costData: any) => {
    const response = await api.post('/indirect-costs/', costData);
    return response.data;
  },
  
  updateIndirectCost: async (costId: string, data: any) => {
    const response = await api.put(`/indirect-costs/${costId}`, data);
    return response.data;
  },
  
  deleteIndirectCost: async (costId: string) => {
    const response = await api.delete(`/indirect-costs/${costId}`);
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getDashboard: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },
  
  getWeeklyReport: async (year: number, weekNumber: number) => {
    const response = await api.get('/reports/weekly', {
      params: { year, week_number: weekNumber }
    });
    return response.data;
  },
  
  getMonthlyReport: async (year: number, month: number) => {
    const response = await api.get('/reports/monthly', {
      params: { year, month }
    });
    return response.data;
  },
  
  getIndirectCostsBreakdown: async (year: number, month: number) => {
    const response = await api.get('/reports/indirect-costs-breakdown', {
      params: { year, month }
    });
    return response.data;
  },
  
  getCostAnalysis: async (year: number, month: number) => {
    const response = await api.get('/reports/cost-analysis', {
      params: { year, month }
    });
    return response.data;
  },
};

export default api;