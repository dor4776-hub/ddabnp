
export type EventType = 'wedding' | 'corporate' | 'private';

export type ItemType = 'count' | 'checkbox' | 'select';

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  quantityOut: number;
  quantityIn: number;
  isCustom?: boolean; // If added by user/AI
  
  // New fields for extended functionality
  itemType?: ItemType; // default is 'count'
  variants?: string[]; // options for 'select' type
  selectedVariant?: string;
  isChecked?: boolean; // for 'checkbox' type
  unit?: string; // e.g., 'ליטר', 'בקבוקים'
  price?: number; // Cost per unit in NIS
  subCategory?: string; // For dynamic filtering (e.g., 'חד"פ' or 'זכוכית')
  isFlatFee?: boolean; // If true, UI shows a direct price input instead of quantity controls
  
  // Basket support
  basketSize?: number; // How many units in one basket
  basketsOut?: number;
  basketsIn?: number;
}

export interface EventRecord {
  id: string;
  type: EventType;
  eventName: string;
  managerName: string;
  eventDate: string;
  items: EquipmentItem[];
  status: 'active' | 'completed';
  notes?: string;
  createdAt: number;
}

export interface EventCategoryTemplate {
  id: EventType;
  label: string;
  icon: string; // Lucide icon name
  defaultItems: EquipmentItem[];
}
