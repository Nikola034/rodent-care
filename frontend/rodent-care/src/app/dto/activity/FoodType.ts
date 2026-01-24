export type FoodType =
  | 'pellets'
  | 'hay'
  | 'vegetables'
  | 'fruit'
  | 'protein'
  | 'treats'
  | 'supplements'
  | 'water'
  | 'other';

export const FOOD_TYPE_OPTIONS = [
  { label: 'Pellets', value: 'pellets' as FoodType },
  { label: 'Hay', value: 'hay' as FoodType },
  { label: 'Vegetables', value: 'vegetables' as FoodType },
  { label: 'Fruit', value: 'fruit' as FoodType },
  { label: 'Protein', value: 'protein' as FoodType },
  { label: 'Treats', value: 'treats' as FoodType },
  { label: 'Supplements', value: 'supplements' as FoodType },
  { label: 'Water', value: 'water' as FoodType },
  { label: 'Other', value: 'other' as FoodType }
];

export function getFoodTypeLabel(foodType: FoodType): string {
  const option = FOOD_TYPE_OPTIONS.find(o => o.value === foodType);
  return option?.label || foodType;
}

export function getFoodTypeIcon(foodType: FoodType): string {
  const iconMap: Record<FoodType, string> = {
    'pellets': 'pi pi-circle-fill',
    'hay': 'pi pi-th-large',
    'vegetables': 'pi pi-stop',
    'fruit': 'pi pi-apple',
    'protein': 'pi pi-bolt',
    'treats': 'pi pi-gift',
    'supplements': 'pi pi-plus-circle',
    'water': 'pi pi-cloud',
    'other': 'pi pi-ellipsis-h'
  };
  return iconMap[foodType] || 'pi pi-circle';
}
