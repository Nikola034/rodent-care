export interface RodentImage {
  id: string;
  filename: string;
  content_type: string;
  data: string; // Base64 encoded
  uploaded_at: string;
  is_primary: boolean;
}
