// Validation utilities for business logic rules

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PurchaseItem {
  id: string;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  date: string;
}

export interface ProductionData {
  schoolId: number;
  schoolName: string;
  starchProduced: number;
  vegetablesProduced: number;
  totalKg: number;
  starchPortionsPerKg: number;
  vegetablePortionsPerKg: number;
  beneficiaries: number;
  mealsCalculated: number;
  date: string;
}

export interface IndirectCost {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
}

// Purchase Validation Rules
export const validatePurchaseItem = (item: PurchaseItem): ValidationResult => {
  const errors: string[] = [];

  // Quantity must be positive
  if (item.quantity <= 0) {
    errors.push(`${item.ingredientName || 'Item'}: Quantity must be positive`);
  }

  // Unit price must be positive
  if (item.unitPrice <= 0) {
    errors.push(`${item.ingredientName || 'Item'}: Unit price must be positive`);
  }

  // Date cannot be in future
  const itemDate = new Date(item.date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (itemDate > today) {
    errors.push(`${item.ingredientName || 'Item'}: Date cannot be in the future`);
  }

  // Validate total price calculation
  const expectedTotal = item.quantity * item.unitPrice;
  if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
    errors.push(`${item.ingredientName || 'Item'}: Total price calculation error`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePurchaseItems = (items: PurchaseItem[]): ValidationResult => {
  const allErrors: string[] = [];

  if (items.length === 0) {
    allErrors.push('At least one purchase item is required');
  }

  items.forEach((item, index) => {
    const validation = validatePurchaseItem(item);
    if (!validation.isValid) {
      allErrors.push(...validation.errors.map(error => `Item ${index + 1}: ${error}`));
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

// Production Validation Rules
export const validateProductionData = (production: ProductionData): ValidationResult => {
  const errors: string[] = [];

  // All kg values must be non-negative
  if (production.starchProduced < 0) {
    errors.push(`${production.schoolName}: Starch produced cannot be negative`);
  }

  if (production.vegetablesProduced < 0) {
    errors.push(`${production.schoolName}: Vegetables produced cannot be negative`);
  }

  // Beneficiaries must be positive
  if (production.beneficiaries <= 0) {
    errors.push(`${production.schoolName}: Number of beneficiaries must be positive`);
  }

  // Portions per kg must be positive
  if (production.starchPortionsPerKg <= 0) {
    errors.push(`${production.schoolName}: Starch portions per kg must be positive`);
  }

  if (production.vegetablePortionsPerKg <= 0) {
    errors.push(`${production.schoolName}: Vegetable portions per kg must be positive`);
  }

  // Validate total kg calculation
  const expectedTotal = production.starchProduced + production.vegetablesProduced;
  if (Math.abs(production.totalKg - expectedTotal) > 0.01) {
    errors.push(`${production.schoolName}: Total kg calculation error`);
  }

  // Date cannot be in future
  const productionDate = new Date(production.date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (productionDate > today) {
    errors.push(`${production.schoolName}: Date cannot be in the future`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateProductionEntries = (entries: ProductionData[]): ValidationResult => {
  const allErrors: string[] = [];

  if (entries.length === 0) {
    allErrors.push('At least one production entry is required');
  }

  entries.forEach(entry => {
    const validation = validateProductionData(entry);
    if (!validation.isValid) {
      allErrors.push(...validation.errors);
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

// Indirect Cost Validation Rules
export const validateIndirectCost = (cost: IndirectCost): ValidationResult => {
  const errors: string[] = [];

  // Amount must be positive
  if (cost.amount <= 0) {
    errors.push('Amount must be positive');
  }

  // Category must be selected
  if (!cost.category || cost.category.trim() === '') {
    errors.push('Category is required');
  }

  // Description must be provided
  if (!cost.description || cost.description.trim() === '') {
    errors.push('Description is required');
  }

  // Date validation (can be current month or previous months, but not future)
  const costDate = new Date(cost.date);
  const today = new Date();
  
  if (costDate > today) {
    errors.push('Date cannot be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Date validation utilities
export const isWithinCurrentMonth = (date: string): boolean => {
  const targetDate = new Date(date);
  const today = new Date();
  
  return targetDate.getMonth() === today.getMonth() && 
         targetDate.getFullYear() === today.getFullYear();
};

export const isEditableDate = (date: string, allowedMonths: number = 1): boolean => {
  const targetDate = new Date(date);
  const today = new Date();
  const monthsAgo = new Date();
  monthsAgo.setMonth(today.getMonth() - allowedMonths);
  
  return targetDate >= monthsAgo && targetDate <= today;
};