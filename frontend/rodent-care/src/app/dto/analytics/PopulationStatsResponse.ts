export interface SpeciesCount {
  species: string;
  count: number;
  percentage: number;
}

export interface GenderDistribution {
  male: number;
  female: number;
  unknown: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface AgeGroupCount {
  age_group: string;
  count: number;
}

export interface PopulationStatsResponse {
  success: boolean;
  total_rodents: number;
  by_species: SpeciesCount[];
  by_gender: GenderDistribution;
  by_status: StatusCount[];
  by_age_group: AgeGroupCount[];
  recent_intakes: number;
  recent_adoptions: number;
}
