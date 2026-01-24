export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  notes?: string | null;
}

export interface MedicationRequest {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  notes?: string | null;
}
