export interface Property {
  id: string;
  source: 'DarGlobal' | 'Wasalt';
  title: string;
  developer: string;
  city: string;
  country: string;
  district: string;
  property_type: 'Villa' | 'Apartment' | 'Penthouse' | 'Mansion' | 'Floor' | 'Land';
  price_sar: number;
  price_usd: number;
  price_formatted: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  area_sqft: number;
  luxury_brand: string;
  features: string[];
  hero_image: string;
  url: string;
  description: string;
  completion?: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: string;
  properties?: Partial<Property>[];
}

export interface SystemStats {
  total_properties: number;
  darglobal_projects: number;
  wasalt_listings: number;
  cities_covered: string[];
  branded_partnerships: string[];
  pricing_sar: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface FilterState {
  source: string;
  city: string;
  property_type: string;
  min_price: number;
  max_price: number;
  min_beds: number;
  search: string;
}
