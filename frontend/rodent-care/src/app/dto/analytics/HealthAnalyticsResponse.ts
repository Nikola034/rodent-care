export interface WeightTrendData {
  date: string;
  avg_weight: number;
  min_weight: number;
  max_weight: number;
  rodent_count: number;
}

export interface SpeciesWeightAvg {
  species: string;
  avg_weight: number;
  min_weight: number;
  max_weight: number;
}

export interface LevelDistribution {
  level: number;
  count: number;
}

export interface RecentTreatment {
  id: string;
  rodent_id: string;
  rodent_name: string;
  record_type: string;
  description: string;
  diagnosis: string | null;
  date: string;
  veterinarian_name: string;
}

export interface TreatmentTypeCount {
  record_type: string;
  count: number;
}

export interface HealthAnalyticsResponse {
  success: boolean;
  weight_trends: WeightTrendData[];
  avg_weight_by_species: SpeciesWeightAvg[];
  energy_level_distribution: LevelDistribution[];
  mood_level_distribution: LevelDistribution[];
  health_observations_count: number;
  recent_treatments: RecentTreatment[];
  treatments_by_type: TreatmentTypeCount[];
}
