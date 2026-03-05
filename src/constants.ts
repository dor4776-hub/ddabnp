
import { EventCategoryTemplate, EquipmentItem } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const createItem = (
  name: string, 
  category: string, 
  options: Partial<EquipmentItem> = {}
): EquipmentItem => ({
  id: generateId(),
  name,
  category,
  quantityOut: 0,
  quantityIn: 0,
  itemType: 'count',
  price: 0, // Default price
  ...options
});

export const CATEGORIES = {
  BAR: 'ציוד בר',
  DESIGN_CRATE: 'ארגז עיצוב',
  DRINKS: 'משקאות (חישוב צריכה)',
  // Alcohol Categories
  VODKA: 'וודקה',
  WHISKEY: 'וויסקי',
  GIN: 'ג׳ין',
  TEQUILA: 'טקילה',
  RUM: 'רום',
  ANISE: 'אניס',
  APERITIF: 'אפרטיף',
  BEER: 'בירות',
  WINE: 'יין',
  ADDITIONAL_COSTS: 'עלויות נוספות',
  EMPLOYEES: 'צוות עובדים',
  
  GENERAL: 'ציוד כללי',
  CONSUMABLES: 'חומרים מתכלים',
  GLASSES: 'כוסות', // Moved to the end conceptually
};

// --- Reusable Alcohol Lists with Prices ---

const aniseItems = [
  createItem('ערק אשקלון/עלית/זייפר', CATEGORIES.ANISE, { unit: 'ליטר', price: 53 }),
  createItem('ערק נח 12', CATEGORIES.ANISE, { unit: 'ליטר', price: 100 }),
  createItem('ערק גלילי', CATEGORIES.ANISE, { unit: 'ליטר', price: 56 }),
  createItem('ערק בן חיים', CATEGORIES.ANISE, { unit: 'ליטר', price: 50 }),
  createItem('אוזו', CATEGORIES.ANISE, { unit: 'ליטר', price: 65 }),
];

const aperitifItems = [
  createItem('אפרול', CATEGORIES.APERITIF, { unit: 'ליטר', price: 73 }),
  createItem('קמפרי', CATEGORIES.APERITIF, { unit: 'ליטר', price: 77 }),
  createItem('מרטיני רוסו', CATEGORIES.APERITIF, { unit: 'ליטר', price: 55 }),
];

const beerItems = [
  createItem('בירה בהירה', CATEGORIES.BEER, { unit: 'בקבוק', price: 5.5 }),
  createItem('בירה כהה', CATEGORIES.BEER, { unit: 'בקבוק', price: 5.5 }),
];

const wineItems = [
  createItem('יין סטנדרט', CATEGORIES.WINE, { unit: 'בקבוק', price: 25 }),
  createItem('יין פרימיום', CATEGORIES.WINE, { unit: 'בקבוק', price: 90 }),
];

const whiskeyItems = [
  createItem('ג׳יימסון', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 119 }),
  createItem('שיבאס/בלונד', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 124 }),
  createItem('גלנפידיך 12', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 189 }),
  createItem('גלנליווט', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 150 }),
  createItem('בלאק לייבל', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 139 }),
  createItem('מקאלן 12', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 159 }),
  createItem('גלנפידיך 15', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 230 }),
  createItem('ג׳ק דניאלס', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 125 }),
  createItem('גלנמורנג׳י', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 170 }),
  createItem('גלנפידיך 14', CATEGORIES.WHISKEY, { unit: 'ליטר', price: 210 }),
];

const vodkaItems = [
  createItem('בלוגה', CATEGORIES.VODKA, { unit: 'ליטר', price: 150 }),
  createItem('גרייגוס', CATEGORIES.VODKA, { unit: 'ליטר', price: 145 }),
  createItem('ואן גוך בטעמים', CATEGORIES.VODKA, { unit: 'ליטר', price: 129 }),
  createItem('ואן גוך אבטיח', CATEGORIES.VODKA, { unit: 'ליטר', price: 129 }),
  createItem('קטל וואן', CATEGORIES.VODKA, { unit: 'ליטר', price: 119 }),
  createItem('מון בלאן', CATEGORIES.VODKA, { unit: 'ליטר', price: 125 }),
  createItem('ריגה בלאק', CATEGORIES.VODKA, { unit: 'ליטר', price: 79 }),
  createItem('סטולי/רוסקי', CATEGORIES.VODKA, { unit: 'ליטר', price: 79 }),
  createItem('וודקה ארטימיס', CATEGORIES.VODKA, { unit: 'ליטר', price: 59 }),
];

const ginItems = [
  createItem('בומביי', CATEGORIES.GIN, { unit: 'ליטר', price: 139 }),
  createItem('טנקרי טן', CATEGORIES.GIN, { unit: 'ליטר', price: 128 }),
  createItem('גורדונס/ביפיטר', CATEGORIES.GIN, { unit: 'ליטר', price: 99 }),
  createItem('ריצמונד', CATEGORIES.GIN, { unit: 'ליטר', price: 95 }),
  createItem('ג׳יי ג׳יי', CATEGORIES.GIN, { unit: 'ליטר', price: 89 }),
  createItem('ג׳ין ארטימיס', CATEGORIES.GIN, { unit: 'ליטר', price: 64 }),
  createItem('הנדריקס', CATEGORIES.GIN, { unit: 'ליטר', price: 140 }),
];

const tequilaItems = [
  createItem('פטרון סילבר', CATEGORIES.TEQUILA, { unit: 'ליטר', price: 215 }),
  createItem('פטרון אנייחו', CATEGORIES.TEQUILA, { unit: 'ליטר', price: 285 }),
  createItem('קוארבו סילבר', CATEGORIES.TEQUILA, { unit: 'ליטר', price: 95 }),
  createItem('סיירה סילבר', CATEGORIES.TEQUILA, { unit: 'ליטר', price: 95 }),
  createItem('טקילה ארטימיס', CATEGORIES.TEQUILA, { unit: 'ליטר', price: 64 }),
];

const rumItems = [
  createItem('בקרדי לבן', CATEGORIES.RUM, { unit: 'ליטר', price: 124 }),
  createItem('בקרדי ספייס', CATEGORIES.RUM, { unit: 'ליטר', price: 139 }),
  createItem('נגריטה', CATEGORIES.RUM, { unit: 'ליטר', price: 95 }),
  createItem('רום ארטימיס', CATEGORIES.RUM, { unit: 'ליטר', price: 64 }),
  createItem('קפטן מורגן ספייס', CATEGORIES.RUM, { unit: 'ליטר', price: 100 }),
];

const allAlcoholItems = [
  ...vodkaItems,
  ...whiskeyItems,
  ...ginItems,
  ...tequilaItems,
  ...rumItems,
  ...aniseItems,
  ...aperitifItems,
  ...beerItems,
  ...wineItems,
];

// --- Common Equipment Base Lists ---

const getBaseBarItems = () => [
  createItem('שייקרים', CATEGORIES.BAR),
  createItem('ג׳יגרים', CATEGORIES.BAR),
  createItem('מסננת רגילה', CATEGORIES.BAR),
  createItem('מסננת כפולה', CATEGORIES.BAR),
  createItem('כפות קרח', CATEGORIES.BAR),
  createItem('מאדלר', CATEGORIES.BAR),
  createItem('קולפן', CATEGORIES.BAR),
  createItem('מלקחי מיקסולוגיה', CATEGORIES.BAR),
  createItem('סקוויזרים', CATEGORIES.BAR),
  createItem('חלבון מקציף', CATEGORIES.BAR),
  createItem('קירחיות(קלקר)', CATEGORIES.BAR),
  createItem('נייר עבודה', CATEGORIES.BAR),
  createItem('ספריי ניקוי', CATEGORIES.BAR),
  createItem('שטיחי בר', CATEGORIES.BAR),
];

const getBaseGeneralItems = () => [
  createItem('צבע בר', CATEGORIES.GENERAL, { 
    itemType: 'select', 
    variants: ['שיש שחור', 'שיש לבן', 'אדום', 'עץ מלא', 'עץ בהיר'],
    selectedVariant: 'שיש שחור'
  }),
  createItem('חלקי בר', CATEGORIES.GENERAL),
  createItem('משטחי עבודה', CATEGORIES.GENERAL),
  createItem('ספידים', CATEGORIES.GENERAL),
  createItem('פח', CATEGORIES.GENERAL),
  createItem('ארגז ניקיון', CATEGORIES.GENERAL),
  createItem('עיצוב עליון', CATEGORIES.GENERAL),
  createItem('אקדח עשן', CATEGORIES.GENERAL, { itemType: 'checkbox' }),
  createItem('מדפסת קוקטיילים', CATEGORIES.GENERAL, { itemType: 'checkbox' }),
  createItem('דיספליי בקבוקים', CATEGORIES.GENERAL, { 
    itemType: 'select', 
    variants: ['עץ', 'וינטג׳'],
    selectedVariant: 'עץ'
  }),
];

const getBaseAdditionalCostsItems = () => [
  createItem('פיתקיות מיתוג', CATEGORIES.ADDITIONAL_COSTS, { quantityOut: 1, isFlatFee: true }),
  createItem('אטבים מיתוג', CATEGORIES.ADDITIONAL_COSTS, { unit: 'חבילה', price: 5, quantityOut: 0 }),
  createItem('בצק סוכר ממותג', CATEGORIES.ADDITIONAL_COSTS, { quantityOut: 1, isFlatFee: true }),
  createItem('גרנישים טריים', CATEGORIES.ADDITIONAL_COSTS, { quantityOut: 1, isFlatFee: true }),
  createItem('דלק', CATEGORIES.ADDITIONAL_COSTS, { quantityOut: 1, isFlatFee: true }),
];

const getBaseEmployeesItems = () => [
  // Employees are essentially flat fees per event
];

// New Glasses List Helper with Updated Pricing and Basket Sizes
const getBaseGlassesItems = () => [
  createItem('סוג כוסות', CATEGORIES.GLASSES, { 
    itemType: 'select', 
    variants: ['חד"פ', 'זכוכית', 'גם וגם'],
    selectedVariant: 'חד"פ'
  }),
  // Disposable (חד"פ) - All cups are 12 NIS
  createItem('אל-על', CATEGORIES.GLASSES, { subCategory: 'חד"פ', price: 12 }),
  createItem('יהלום', CATEGORIES.GLASSES, { subCategory: 'חד"פ', price: 12 }),
  createItem('קוקטייל', CATEGORIES.GLASSES, { subCategory: 'חד"פ', price: 12 }),
  createItem('הייבול', CATEGORIES.GLASSES, { subCategory: 'חד"פ', name: 'הייבול (חד"פ)', price: 12 }),
  createItem('קשים', CATEGORIES.GLASSES, { subCategory: 'חד"פ', price: 0 }),
  createItem('מפיות', CATEGORIES.GLASSES, { subCategory: 'חד"פ', price: 0 }),
  // Glass (זכוכית) - Specific prices and Basket sizes
  createItem('מרטיני', CATEGORIES.GLASSES, { subCategory: 'זכוכית', price: 8, basketSize: 16 }),
  createItem('סוואר', CATEGORIES.GLASSES, { subCategory: 'זכוכית', price: 8, basketSize: 25 }),
  createItem('הייבול', CATEGORIES.GLASSES, { subCategory: 'זכוכית', name: 'הייבול (זכוכית)', price: 2.5, basketSize: 36 }),
  createItem('הייבול מעוטרת', CATEGORIES.GLASSES, { subCategory: 'זכוכית', price: 8, basketSize: 36 }),
  createItem('ביצה', CATEGORIES.GLASSES, { subCategory: 'זכוכית', price: 8, basketSize: 25 }),
];

// --- Specific Event Lists ---

// Wedding Specific List
const weddingItems: EquipmentItem[] = [
  ...getBaseBarItems(),
  createItem('ארגז עיצוב מותאם לאירוע', CATEGORIES.DESIGN_CRATE, { 
    itemType: 'checkbox',
    isChecked: false 
  }),
  createItem('גרנישים יבשים', CATEGORIES.DESIGN_CRATE, { 
    itemType: 'checkbox',
    isChecked: false 
  }),
  createItem('באצים', CATEGORIES.DRINKS, { unit: 'ליטר', price: 65 }),
  createItem('לימון', CATEGORIES.DRINKS, { unit: 'ליטר' }),
  createItem('מיצים', CATEGORIES.DRINKS, { unit: 'בקבוקים', price: 8 }),
  ...allAlcoholItems.map(item => ({ ...item, id: generateId() })),
  ...getBaseGeneralItems(),
  ...getBaseGlassesItems(), // Last
  ...getBaseAdditionalCostsItems(),
  ...getBaseEmployeesItems(),
];

// Corporate Specific List
const corporateItems: EquipmentItem[] = [
  ...getBaseBarItems(),
  createItem('ארגז עיצוב מותאם לאירוע', CATEGORIES.DESIGN_CRATE, { 
    itemType: 'checkbox',
    isChecked: false 
  }),
  createItem('גרנישים יבשים', CATEGORIES.DESIGN_CRATE, { 
    itemType: 'checkbox',
    isChecked: false 
  }),
  createItem('באצים', CATEGORIES.DRINKS, { unit: 'ליטר', price: 65 }),
  createItem('לימון', CATEGORIES.DRINKS, { unit: 'ליטר' }),
  createItem('מיצים', CATEGORIES.DRINKS, { unit: 'בקבוקים', price: 8 }),
  ...allAlcoholItems.map(item => ({ ...item, id: generateId() })),
  ...getBaseGeneralItems(),
  createItem('מיתוג רול-אפ', CATEGORIES.GENERAL),
  ...getBaseGlassesItems(), // Last
  ...getBaseAdditionalCostsItems(),
];

// Private Event Specific List
const privateItems: EquipmentItem[] = [
  ...getBaseBarItems(),
  createItem('ארגז עיצוב מותאם לאירוע', CATEGORIES.DESIGN_CRATE, { 
    itemType: 'checkbox',
    isChecked: false 
  }),
  createItem('גרנישים יבשים', CATEGORIES.DESIGN_CRATE, { 
    itemType: 'checkbox',
    isChecked: false 
  }),
  createItem('באצים', CATEGORIES.DRINKS, { unit: 'ליטר', price: 65 }),
  createItem('לימון', CATEGORIES.DRINKS, { unit: 'ליטר' }),
  createItem('מיצים', CATEGORIES.DRINKS, { unit: 'בקבוקים', price: 8 }),
  ...allAlcoholItems.map(item => ({ ...item, id: generateId() })),
  ...getBaseGeneralItems(),
  createItem('צידנית ענק', CATEGORIES.GENERAL),
  ...getBaseGlassesItems(), // Last
  ...getBaseAdditionalCostsItems(),
];

export const EVENT_TEMPLATES: Record<string, EventCategoryTemplate> = {
  wedding: {
    id: 'wedding',
    label: 'חתונה',
    icon: 'Heart',
    defaultItems: weddingItems,
  },
  corporate: {
    id: 'corporate',
    label: 'אירוע חברה',
    icon: 'Building2',
    defaultItems: corporateItems,
  },
  private: {
    id: 'private',
    label: 'אירוע פרטי',
    icon: 'PartyPopper',
    defaultItems: privateItems,
  },
};
