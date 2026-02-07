export const CATEGORIES = [
  { value: 'OUTLET_ROPA', label: 'Ropa', color: 'bg-pink-500' },
  { value: 'OUTLET_TECNO', label: 'Tecnología', color: 'bg-blue-500' },
  { value: 'OUTLET_HOGAR', label: 'Hogar', color: 'bg-green-500' },
  { value: 'OUTLET_ZAPATOS', label: 'Zapatos', color: 'bg-purple-500' },
  { value: 'OUTLET_BELLEZA', label: 'Belleza', color: 'bg-pink-400' },
  { value: 'OTROS', label: 'Otros', color: 'bg-amber-500' },
] as const;

export type CategoryValue = typeof CATEGORIES[number]['value'];

export const getCategoryLabel = (value: string): string => {
  const category = CATEGORIES.find(c => c.value === value);
  return category?.label || value;
};

export const getCategoryColor = (value: string): string => {
  const category = CATEGORIES.find(c => c.value === value);
  return category?.color || 'bg-gray-500';
};

// Categories that require size selection
export const SIZE_CATEGORIES = ['OUTLET_ROPA', 'OUTLET_ZAPATOS'] as const;

export const requiresSize = (category: string): boolean => {
  return SIZE_CATEGORIES.includes(category as typeof SIZE_CATEGORIES[number]);
};

// Clothing sizes
export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

// Shoe sizes (EU)
export const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'] as const;

export const getSizesForCategory = (category: string): readonly string[] => {
  if (category === 'OUTLET_ROPA') return CLOTHING_SIZES;
  if (category === 'OUTLET_ZAPATOS') return SHOE_SIZES;
  return [];
};
