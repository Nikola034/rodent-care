export type ActivityType =
  | 'wheel_running'
  | 'swimming'
  | 'digging'
  | 'social_interaction'
  | 'playing'
  | 'grooming'
  | 'exploring'
  | 'resting'
  | 'other';

export const ACTIVITY_TYPE_OPTIONS = [
  { label: 'Wheel Running', value: 'wheel_running' as ActivityType },
  { label: 'Swimming', value: 'swimming' as ActivityType },
  { label: 'Digging', value: 'digging' as ActivityType },
  { label: 'Social Interaction', value: 'social_interaction' as ActivityType },
  { label: 'Playing', value: 'playing' as ActivityType },
  { label: 'Grooming', value: 'grooming' as ActivityType },
  { label: 'Exploring', value: 'exploring' as ActivityType },
  { label: 'Resting', value: 'resting' as ActivityType },
  { label: 'Other', value: 'other' as ActivityType }
];

export function getActivityTypeLabel(activityType: ActivityType): string {
  const option = ACTIVITY_TYPE_OPTIONS.find(o => o.value === activityType);
  return option?.label || activityType;
}

export function getActivityTypeIcon(activityType: ActivityType): string {
  const iconMap: Record<ActivityType, string> = {
    'wheel_running': 'pi pi-sync',
    'swimming': 'pi pi-cloud',
    'digging': 'pi pi-arrow-down',
    'social_interaction': 'pi pi-users',
    'playing': 'pi pi-star',
    'grooming': 'pi pi-sparkles',
    'exploring': 'pi pi-compass',
    'resting': 'pi pi-moon',
    'other': 'pi pi-ellipsis-h'
  };
  return iconMap[activityType] || 'pi pi-circle';
}
