
import React, { useState, useMemo, useRef } from 'react';
import { EventRecord, EquipmentItem } from '../types';
import { Save, ArrowRight, Plus, Sparkles, AlertTriangle, CheckCheck, Boxes, User, Calendar, CheckSquare, Square, Droplets, XCircle, Coins, Package } from 'lucide-react';
import { EVENT_TEMPLATES, CATEGORIES } from "../constants";
import { getEquipmentSuggestions } from "../services/geminiService";
interface EventFormProps {
  event: EventRecord;
  onSave: (updatedEvent: EventRecord) => void;
  onBack: () => void;
}

const MANAGERS = ['ניר פטלוק', 'דור ארביב', 'גיא פטלוק', 'רועי אבקסיס'];
const EMPLOYEE_LIST = ['גיא פטלוק', 'שני מארק', 'רון אלמקייס', 'ניר פטלוק', 'דור ארביב', 'רועי אבקסיס'];

export const EventForm: React.FC<EventFormProps> = ({ event, onSave, onBack }) => {
  const [formData, setFormData] = useState<EventRecord>(event);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES.GENERAL);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, EquipmentItem[]> = {};
    
    formData.items.forEach(item => {
      // Logic for Glasses Category filtering
      if (item.category === CATEGORIES.GLASSES) {
        // Always show the selector
        if (item.name === 'סוג כוסות') {
           if (!groups[item.category]) groups[item.category] = [];
           groups[item.category].push(item);
           return;
        }
        // Show item only if it belongs to the selected subCategory OR has no subCategory (custom items)
        const glassesSelector = formData.items.find(i => i.category === CATEGORIES.GLASSES && i.name === 'סוג כוסות');
        const selectedGlassType = glassesSelector?.selectedVariant || 'חד"פ';
        
        if (selectedGlassType !== 'גם וגם' && item.subCategory && item.subCategory !== selectedGlassType) {
          return;
        }
      }

      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    // Ensure Employees and Additional Costs categories always exist and are at the end
    if (!groups[CATEGORIES.ADDITIONAL_COSTS]) groups[CATEGORIES.ADDITIONAL_COSTS] = [];
    if (!groups[CATEGORIES.EMPLOYEES]) groups[CATEGORIES.EMPLOYEES] = [];
    
    // Sort categories to ensure Additional Costs and Employees are at the bottom
    const sortedGroups: Record<string, EquipmentItem[]> = {};
    const allCategories = Object.keys(groups);
    const bottomCategories = [CATEGORIES.ADDITIONAL_COSTS, CATEGORIES.EMPLOYEES];
    
    // Add all other categories first
    allCategories.filter(c => !bottomCategories.includes(c)).forEach(c => {
      sortedGroups[c] = groups[c];
    });
    
    // Add bottom categories last
    bottomCategories.forEach(c => {
      sortedGroups[c] = groups[c];
    });
    
    return sortedGroups;
  }, [formData.items]);

  const handleUpdateItem = (id: string, field: keyof EquipmentItem, value: any) => {
    const updatedItems = formData.items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleUpdateQuantity = (id: string, field: 'quantityOut' | 'quantityIn', delta: number) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === id) {
        const newValue = Math.max(0, (item[field] || 0) + delta);
        return { ...item, [field]: newValue };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  // Function to update baskets and automatically adjust quantity
  const handleUpdateBaskets = (id: string, field: 'basketsOut' | 'basketsIn', delta: number) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === id && item.basketSize) {
        const currentBaskets = item[field] || 0;
        const newBaskets = Math.max(0, currentBaskets + delta);
        
        // Calculate new unit quantity based on basket change
        const qtyField = field === 'basketsOut' ? 'quantityOut' : 'quantityIn';
        const newQuantity = newBaskets * item.basketSize;

        return { 
          ...item, 
          [field]: newBaskets,
          [qtyField]: newQuantity
        };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: EquipmentItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      category: newItemCategory,
      quantityOut: newItemCategory === CATEGORIES.ADDITIONAL_COSTS ? 1 : 1, // Actually 1 is fine for all custom items
      quantityIn: 0,
      isCustom: true,
      itemType: 'count'
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setNewItemName('');
  };

  const handleAddEmployee = () => {
    const nameToAdd = selectedEmployee === 'אחר' ? newItemName : selectedEmployee;
    if (!nameToAdd.trim()) return;
    
    const newItem: EquipmentItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: nameToAdd,
      category: CATEGORIES.EMPLOYEES,
      quantityOut: 1,
      quantityIn: 0,
      isCustom: true,
      itemType: 'count',
      price: 0,
      isFlatFee: true
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedEmployee('');
    setNewItemName('');
  };

  const handleRemoveItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleAiSuggest = async () => {
    if (!process.env.API_KEY) {
      alert("AI feature is not available (API Key missing).");
      return;
    }
    setIsAiLoading(true);
    try {
      const existingNames = formData.items.map(i => i.name);
      const suggestions = await getEquipmentSuggestions(
        EVENT_TEMPLATES[formData.type].label,
        formData.eventName,
        existingNames
      );
      
      if (suggestions.length > 0) {
        const newItems = suggestions.map(s => ({
          id: Math.random().toString(36).substr(2, 9),
          name: s.name,
          category: s.category,
          quantityOut: 1,
          quantityIn: 0,
          isCustom: true,
          itemType: 'count' as const
        }));
        setFormData(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
        alert(`הוספנו ${suggestions.length} פריטים מומלצים:\n` + suggestions.map(s => `• ${s.name}: ${s.reason}`).join('\n'));
      } else {
        alert("לא נמצאו המלצות נוספות כרגע.");
      }
    } catch (e) {
      console.error(e);
      alert("אירעה שגיאה בקבלת ההמלצות.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const calculateStatus = (item: EquipmentItem) => {
    if (item.itemType === 'checkbox') return item.isChecked ? 'ok' : 'neutral';
    
    if (item.quantityOut === 0) return 'neutral';
    if (item.quantityIn === item.quantityOut) return 'ok';
    if (item.quantityIn > item.quantityOut) return 'warning'; // Returned more?
    return 'pending'; // Still missing
  };

  const missingCount = formData.items.reduce((acc, item) => {
    if (item.itemType === 'checkbox') return acc;
    // Exclude flat fees, employees and additional costs from missing equipment count
    // (Additional costs like clips are treated as consumables)
    if (item.isFlatFee || item.category === CATEGORIES.EMPLOYEES || item.category === CATEGORIES.ADDITIONAL_COSTS) return acc;
    return acc + Math.max(0, item.quantityOut - item.quantityIn);
  }, 0);

  // Calculate total event cost
  const totalEventCost = formData.items.reduce((sum, item) => {
    const diff = Math.max(0, item.quantityOut - item.quantityIn);
    const price = item.price || 0;
    return sum + (diff * price);
  }, 0);

  // Helper to determine if an item should show the Consumption Badge
  const checkIsConsumable = (category: string) => {
    const consumableCategories = [
      CATEGORIES.DRINKS,
      CATEGORIES.CONSUMABLES,
      CATEGORIES.VODKA,
      CATEGORIES.WHISKEY,
      CATEGORIES.GIN,
      CATEGORIES.TEQUILA,
      CATEGORIES.RUM,
      CATEGORIES.ANISE,
      CATEGORIES.APERITIF
    ];
    return consumableCategories.includes(category);
  };

  const renderItemControls = (item: EquipmentItem) => {
    // 0. Special Case: Glasses Selection Row (No quantity controls)
    if (item.category === CATEGORIES.GLASSES && item.name === 'סוג כוסות') {
        return (
          <div className="flex items-center gap-4 justify-end w-full sm:w-auto">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">בחר סוג הגשה</span>
                <select
                    value={item.selectedVariant}
                    onChange={(e) => handleUpdateItem(item.id, 'selectedVariant', e.target.value)}
                    className="text-lg font-black bg-indigo-600 text-white border-none rounded-xl px-6 py-2.5 focus:outline-none focus:ring-4 focus:ring-indigo-200 shadow-lg cursor-pointer transition-all hover:bg-indigo-700 active:scale-95"
                >
                    {item.variants?.map(v => (
                    <option key={v} value={v} className="bg-white text-slate-800 font-bold">{v}</option>
                    ))}
                </select>
             </div>
          </div>
        );
    }

    // 1. Checkbox Type
    if (item.itemType === 'checkbox') {
      return (
        <div 
          className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
            item.isChecked 
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
              : 'border-slate-200 hover:border-slate-300 text-slate-500'
          }`}
          onClick={() => handleUpdateItem(item.id, 'isChecked', !item.isChecked)}
        >
          {item.isChecked ? <CheckSquare size={24} /> : <Square size={24} />}
          <span className="font-bold">{item.isChecked ? 'נלקח' : 'לא נלקח'}</span>
        </div>
      );
    }

    // 2. Select / Count Types
    const isConsumable = checkIsConsumable(item.category);
    const isAdditional = item.category === CATEGORIES.ADDITIONAL_COSTS;
    const isEmployee = item.category === CATEGORIES.EMPLOYEES;
    
    const diff = item.quantityOut - item.quantityIn;
    const calculatedCost = Math.max(0, diff) * (item.price || 0);
    const isGlass = item.subCategory === 'זכוכית' && item.basketSize;
    
    return (
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
        {/* Delete button for dynamic items */}
        {(isAdditional || isEmployee || item.isCustom) && (
          <button 
            onClick={() => handleRemoveItem(item.id)}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
            title="הסר פריט"
          >
            <XCircle size={18} />
          </button>
        )}

        {/* Variant Selector (if not Glass Type selector handled above) */}
        {item.itemType === 'select' && item.variants && item.name !== 'סוג כוסות' && (
          <select
            value={item.selectedVariant}
            onChange={(e) => handleUpdateItem(item.id, 'selectedVariant', e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {item.variants.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}

        {/* Cost Badge - Show if there is a cost */}
        {calculatedCost > 0 && (
          <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border shadow-sm min-w-[60px] ${
            isEmployee ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
          }`}>
             <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-80 mb-0.5">
               {isEmployee ? 'שכר' : 'סה״כ עלות'}
             </span>
             <span className="font-mono font-black text-base flex items-center gap-1 leading-none">
               ₪{calculatedCost.toLocaleString()}
             </span>
          </div>
        )}

        {/* Consumable Calculator Badge */}
        {isConsumable && item.quantityOut > 0 && (
          <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border-2 shadow-sm min-w-[60px] ${
            diff < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
             <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-80 mb-0.5">סה״כ נשתה</span>
             <span className="font-mono font-black text-xl flex items-center gap-1 leading-none">
               <Droplets size={14} className="stroke-[3px]" />
               {Math.max(0, diff)}
             </span>
          </div>
        )}

        {/* Tool Lost Badge (Not Consumable + Missing) */}
        {!isConsumable && !isAdditional && !isEmployee && item.quantityOut > 0 && diff > 0 && (
           <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border-2 border-red-200 bg-red-50 text-red-700 shadow-sm min-w-[60px]">
             <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-80 mb-0.5">נאבד</span>
             <span className="font-mono font-black text-xl flex items-center gap-1 leading-none">
               <XCircle size={14} className="stroke-[3px]" />
               {diff}
             </span>
          </div>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          {/* Glass Baskets UI (Cool Feature) */}
          {isGlass && (
            <div className="flex flex-col items-center gap-1">
               <label className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">סקטים ({item.basketSize})</label>
               <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded-xl border-2 border-indigo-100 shadow-inner">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleUpdateBaskets(item.id, 'basketsOut', 1)}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-90 transition-all shadow-sm"
                      title="הוסף סקט ליציאה"
                    >
                      <Package size={14} />
                    </button>
                    <button 
                      onClick={() => handleUpdateBaskets(item.id, 'basketsOut', -1)}
                      className="p-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 active:scale-90 transition-all shadow-sm"
                      title="הפחת סקט מיציאה"
                    >
                      <Package size={14} className="opacity-50" />
                    </button>
                  </div>
                  
                  <div className="w-10 flex flex-col items-center">
                    <span className="text-xl font-black text-indigo-800 leading-none">{(item.basketsOut || 0)}</span>
                    <span className="text-[8px] text-indigo-400 font-bold">יצא</span>
                  </div>

                  <div className="h-8 w-px bg-indigo-200 mx-1"></div>

                  <div className="w-10 flex flex-col items-center">
                    <span className="text-xl font-black text-emerald-600 leading-none">{(item.basketsIn || 0)}</span>
                    <span className="text-[8px] text-emerald-400 font-bold">חזר</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleUpdateBaskets(item.id, 'basketsIn', 1)}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-90 transition-all shadow-sm"
                      title="הוסף סקט לחזרה"
                    >
                      <Package size={14} />
                    </button>
                    <button 
                      onClick={() => handleUpdateBaskets(item.id, 'basketsIn', -1)}
                      className="p-1.5 bg-white text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 active:scale-90 transition-all shadow-sm"
                      title="הפחת סקט מחזרה"
                    >
                      <Package size={14} className="opacity-50" />
                    </button>
                  </div>
               </div>
            </div>
          )}

          <div className="flex flex-col items-center">
            <label className="text-[10px] text-slate-400 font-medium mb-1">
              {item.isFlatFee ? (isEmployee ? 'שכר' : 'סכום') : (isAdditional ? 'כמות' : `יצא ${item.price ? `(₪${item.price})` : ''}`)}
            </label>
            <div className={`flex items-center border rounded-lg bg-white overflow-hidden shadow-sm ${
              (isAdditional || isEmployee) ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'
            }`}>
              {item.isFlatFee ? (
                <div className="flex items-center">
                   <span className="px-2 text-slate-400 font-bold">₪</span>
                   <input 
                    type="number"
                    value={item.price || 0}
                    onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-2 text-base font-black text-indigo-700 focus:outline-none"
                   />
                </div>
              ) : (
                <>
                  <button 
                    className="px-3 py-1.5 hover:bg-slate-100 text-slate-500 border-l border-slate-100 active:bg-slate-200"
                    onClick={() => handleUpdateQuantity(item.id, 'quantityOut', 1)}
                  >
                    +
                  </button>
                  <div className="w-12 text-center text-sm font-semibold bg-white flex items-center justify-center gap-1">
                    {item.quantityOut}
                    {item.unit && <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>}
                  </div>
                  <button 
                    className="px-3 py-1.5 hover:bg-slate-100 text-slate-500 border-r border-slate-100 active:bg-slate-200"
                    onClick={() => handleUpdateQuantity(item.id, 'quantityOut', -1)}
                  >
                    -
                  </button>
                </>
              )}
            </div>
          </div>

          {!item.isFlatFee && !isAdditional && (
            <div className="flex flex-col items-center">
              <label className="text-[10px] text-slate-400 font-medium mb-1">חזר</label>
              <div className={`flex items-center border rounded-lg bg-white overflow-hidden shadow-sm ${
                item.quantityIn === item.quantityOut && item.quantityOut > 0 ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'
              }`}>
                <button 
                  className="px-3 py-1.5 hover:bg-slate-100 text-slate-500 border-l border-slate-100 active:bg-slate-200"
                  onClick={() => handleUpdateQuantity(item.id, 'quantityIn', 1)}
                >
                  +
                </button>
                <div className={`w-12 text-center text-sm font-semibold flex items-center justify-center gap-1 ${
                    item.quantityIn === item.quantityOut && item.quantityOut > 0 ? 'text-emerald-600' : 'text-slate-800'
                }`}>
                  {item.quantityIn}
                  {item.unit && <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>}
                </div>
                <button 
                  className="px-3 py-1.5 hover:bg-slate-100 text-slate-500 border-r border-slate-100 active:bg-slate-200"
                  onClick={() => handleUpdateQuantity(item.id, 'quantityIn', -1)}
                >
                  -
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-40">
      {/* Header / Meta Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
            <ArrowRight size={16} />
            חזרה לרשימה
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleAiSuggest}
              disabled={isAiLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-md text-sm font-medium"
            >
              <Sparkles size={16} className={isAiLoading ? 'animate-spin' : ''} />
              {isAiLoading ? 'חושב...' : 'המלצות חכמות'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">שם האירוע</label>
            <div className="relative">
              <Boxes className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.eventName}
                onChange={e => setFormData({...formData, eventName: e.target.value})}
                className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                placeholder="למשל: חתונת כהן ולוי"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">מנהל אירוע</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={formData.managerName}
                onChange={e => setFormData({...formData, managerName: e.target.value})}
                className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium appearance-none"
              >
                <option value="" disabled>בחר מנהל...</option>
                {MANAGERS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">תאריך</label>
            <div className="relative" onClick={() => dateInputRef.current?.showPicker()}>
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" size={16} />
              <input
                ref={dateInputRef}
                type="date"
                value={formData.eventDate}
                onChange={e => setFormData({...formData, eventDate: e.target.value})}
                className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
           <div className="flex-1 w-full">
             <div className="text-sm text-slate-500">סטטוס ציוד (כמותי)</div>
             <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${formData.items.filter(i => i.itemType !== 'checkbox' && i.quantityOut > 0).length > 0 ? (formData.items.filter(i => i.itemType !== 'checkbox' && i.quantityIn >= i.quantityOut && i.quantityOut > 0).length / formData.items.filter(i => i.itemType !== 'checkbox' && i.quantityOut > 0).length) * 100 : 0}%` }}
                />
             </div>
           </div>
           <div className="flex w-full sm:w-auto items-center gap-2 px-4 py-2 bg-white rounded shadow-sm border border-slate-200">
              <div className={`p-1.5 rounded-full ${missingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {missingCount > 0 ? <AlertTriangle size={18} /> : <CheckCheck size={18} />}
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-500">חסרים להחזרה</div>
                <div className="font-bold text-slate-800">{missingCount}</div>
              </div>
           </div>
        </div>
      </div>

      {/* Equipment Lists by Category */}
      {Object.entries(groupedItems).map(([category, items]) => {
        const categoryItems = items as EquipmentItem[];
        const isEmployeeCategory = category === CATEGORIES.EMPLOYEES;
        const isAdditionalCategory = category === CATEGORIES.ADDITIONAL_COSTS;

        return (
          <div key={category} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
            isEmployeeCategory ? 'border-amber-200 ring-4 ring-amber-50' : 
            isAdditionalCategory ? 'border-indigo-200 ring-4 ring-indigo-50' : 
            'border-slate-200'
          }`}>
            <div className={`${
              isEmployeeCategory ? 'bg-amber-50 border-amber-100' : 
              isAdditionalCategory ? 'bg-indigo-50 border-indigo-100' : 
              'bg-slate-50 border-slate-200'
            } px-6 py-3 border-b flex justify-between items-center`}>
              <h3 className={`font-bold ${
                isEmployeeCategory ? 'text-amber-800' : 
                isAdditionalCategory ? 'text-indigo-800' : 
                'text-slate-700'
              }`}>{category}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isEmployeeCategory ? 'bg-amber-200 text-amber-700' : 
                isAdditionalCategory ? 'bg-indigo-200 text-indigo-700' : 
                'bg-slate-200 text-slate-600'
              }`}>{categoryItems.length} פריטים</span>
            </div>
            
            {/* Special Add Employee UI */}
            {isEmployeeCategory && (
              <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-grow w-full">
                  <label className="text-xs text-amber-600 font-bold mb-1 block uppercase">בחר עובד מהרשימה</label>
                  <select 
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-bold text-amber-900"
                  >
                    <option value="">בחר עובד...</option>
                    {EMPLOYEE_LIST.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="אחר">עובד אחר (הקלד שם למטה)...</option>
                  </select>
                </div>
                {selectedEmployee === 'אחר' && (
                  <div className="flex-grow w-full">
                    <label className="text-xs text-amber-600 font-bold mb-1 block uppercase">שם העובד</label>
                    <input 
                      type="text" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="הקלד שם עובד..."
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
                <button 
                  onClick={handleAddEmployee}
                  disabled={!selectedEmployee || (selectedEmployee === 'אחר' && !newItemName.trim())}
                  className="w-full sm:w-auto px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-md disabled:opacity-50"
                >
                  <Plus size={18} />
                  הוסף עובד
                </button>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {categoryItems.map(item => {
                const status = calculateStatus(item);
                return (
                  <div key={item.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors ${
                    isEmployeeCategory ? 'hover:bg-amber-50/30' : 
                    isAdditionalCategory ? 'hover:bg-indigo-50/30' : 
                    'hover:bg-slate-50'
                  }`}>
                    <div className="flex-grow flex items-center gap-3 w-full sm:w-auto">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        status === 'ok' ? 'bg-emerald-500' : 
                        status === 'warning' ? 'bg-amber-500' : 
                        status === 'pending' ? 'bg-slate-300' : 'bg-slate-200'
                      }`} />
                      <span className={`font-medium text-lg sm:text-base ${
                        isEmployeeCategory ? 'text-amber-900 font-bold' : 
                        isAdditionalCategory ? 'text-indigo-900 font-bold' : 
                        'text-slate-800'
                      }`}>{item.name}</span>
                      {item.isCustom && !isEmployeeCategory && !isAdditionalCategory && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">נוסף ידנית</span>}
                    </div>
                    
                    {renderItemControls(item)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add new Item Manual */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
        <div className="flex-grow w-full">
           <label className="text-xs text-slate-500 mb-1 block">שם הפריט להוספה</label>
           <input 
              type="text" 
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="רשום שם פריט..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
           />
        </div>
        <div className="w-full sm:w-48">
            <label className="text-xs text-slate-500 mb-1 block">קטגוריה</label>
            <select 
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {Object.values(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
              <option value="אחר">אחר</option>
            </select>
        </div>
        <button 
          onClick={handleAddItem}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          הוסף
        </button>
      </div>

      {/* Sticky Bottom Summary and Save */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-40 p-4">
         <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 justify-between">
           {/* Grand Total Display */}
           <div className="flex items-center gap-3 w-full sm:w-auto p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                <Coins size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">סה״כ לתשלום</span>
                <span className="text-2xl font-black text-indigo-700 leading-none">
                  ₪{totalEventCost.toLocaleString()}
                </span>
              </div>
           </div>

         <button 
  onClick={() => onSave(formData)} // פשוט וקל, בלי לוגיקה מסובכת בכפתור
  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
>
  <Save size={20} />
  שמור נתונים והורד דוח
</button>
         </div>
      </div>
    </div>
  );
};
