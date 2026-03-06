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

// Business categories
export const BUSINESS_CATEGORIES = [
  { value: 'GESTORIA', label: 'Gestoría', icon: '📋', color: 'bg-slate-500' },
  { value: 'ABOGADOS', label: 'Abogados', icon: '⚖️', color: 'bg-indigo-600' },
  { value: 'FONTANERIA', label: 'Fontanería', icon: '🔧', color: 'bg-cyan-500' },
  { value: 'ELECTRICIDAD', label: 'Electricidad', icon: '⚡', color: 'bg-yellow-500' },
  { value: 'DENTISTA', label: 'Dentista', icon: '🦷', color: 'bg-sky-400' },
  { value: 'MEDICO', label: 'Médico', icon: '🏥', color: 'bg-red-500' },
  { value: 'INFORMATICA', label: 'Informática', icon: '💻', color: 'bg-violet-500' },
  { value: 'PRL', label: 'Prevención de Riesgos', icon: '🦺', color: 'bg-orange-500' },
  { value: 'AUTOESCUELA', label: 'Autoescuela', icon: '🚗', color: 'bg-emerald-500' },
  { value: 'PELUQUERIA_MUJER', label: 'Peluquería Mujer', icon: '💇‍♀️', color: 'bg-pink-500' },
  { value: 'PELUQUERIA_HOMBRE', label: 'Peluquería Hombre', icon: '💈', color: 'bg-blue-600' },
  { value: 'VETERINARIA', label: 'Veterinaria', icon: '🐾', color: 'bg-lime-500' },
  { value: 'INMOBILIARIA', label: 'Inmobiliaria', icon: '🏠', color: 'bg-teal-500' },
  { value: 'RESTAURACION', label: 'Restauración', icon: '🍽️', color: 'bg-amber-600' },
  { value: 'OTROS_SERVICIOS', label: 'Otros Servicios', icon: '🔹', color: 'bg-gray-500' },
] as const;

export type BusinessCategoryValue = typeof BUSINESS_CATEGORIES[number]['value'];

export const getBusinessCategoryLabel = (value: string): string => {
  const cat = BUSINESS_CATEGORIES.find(c => c.value === value);
  return cat?.label || value;
};

export const getBusinessCategoryColor = (value: string): string => {
  const cat = BUSINESS_CATEGORIES.find(c => c.value === value);
  return cat?.color || 'bg-gray-500';
};

export const getBusinessCategoryIcon = (value: string): string => {
  const cat = BUSINESS_CATEGORIES.find(c => c.value === value);
  return cat?.icon || '🔹';
};
