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
