import React, { useState } from 'react';
import type { EventRecord, EquipmentItem } from '../types';

interface EventFormProps {
  event: EventRecord;
  onSave: (event: EventRecord) => void;
  onBack: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({ event, onSave, onBack }) => {
  const [formData, setFormData] = useState<EventRecord>(event);

  const handleItemChange = (itemId: string, field: keyof EquipmentItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      {/* כותרת האירוע - עיצוב מקורי */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-yellow-500 font-bold text-2xl tracking-tight">
              {formData.eventName || 'אירוע חדש'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {new Date(formData.eventDate).toLocaleDateString('he-IL')} | מנהל: {formData.managerName || 'לא הוזן'}
            </p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-lg">
            <span className="text-yellow-500 text-xs font-bold uppercase">{formData.type}</span>
          </div>
        </div>
      </div>

      {/* רשימת הפריטים עם כל החישובים */}
      <div className="grid gap-4">
        {formData.items.map(item => {
          // חישובי כמויות ועלויות בתוך הטופס
          const diff = item.itemType === 'checkbox' ? (item.isChecked ? 1 : 0) : (item.quantityOut - (item.quantityIn || 0));
          const consumption = Math.max(0, diff);
          const totalCost = consumption * (item.price || 0);

          return (
            <div key={item.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                <div>
                  <p className="text-white font-bold">{item.name}{item.selectedVariant ? ` (${item.selectedVariant})` : ''}</p>
                  <p className="text-gray-500 text-[10px] uppercase">{item.category}</p>
                </div>
                {totalCost > 0 && (
                  <div className="text-emerald-500 font-bold text-sm">₪{totalCost.toLocaleString()}</div>
                )}
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">
                {/* צד ימין - הזנת נתונים */}
                <div className="flex gap-2">
                  {item.itemType === 'number' ? (
                    <>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 mb-1 font-bold">יצא</span>
                        <input 
                          type="number" 
                          value={item.quantityOut || ''} 
                          placeholder="0"
                          onChange={(e) => handleItemChange(item.id, 'quantityOut', parseInt(e.target.value) || 0)}
                          className="w-full bg-black border border-gray-700 text-white text-center p-2 rounded-lg focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 mb-1 font-bold">חזר</span>
                        <input 
                          type="number" 
                          value={item.quantityIn || ''} 
                          placeholder="0"
                          onChange={(e) => handleItemChange(item.id, 'quantityIn', parseInt(e.target.value) || 0)}
                          className="w-full bg-gray-800 border border-gray-700 text-white text-center p-2 rounded-lg focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex justify-center items-center py-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-xs text-gray-400 font-bold">בוצע?</span>
                        <input 
                          type="checkbox" 
                          checked={item.isChecked}
                          onChange={(e) => handleItemChange(item.id, 'isChecked', e.target.checked)}
                          className="w-6 h-6 rounded border-gray-700 bg-black text-yellow-500 focus:ring-yellow-500"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* צד שמאל - סיכום פריט (חישובים) */}
                {item.itemType === 'number' && (
                  <div className="bg-black/30 rounded-lg p-2 flex flex-col justify-center items-center border border-gray-800/50">
                    <span className="text-[9px] text-gray-500 uppercase">נצרך/נעלם</span>
                    <span className={`text-lg font-bold ${consumption > 0 ? 'text-yellow-500' : 'text-gray-700'}`}>
                      {consumption}
                    </span>
                    <span className="text-[9px] text-gray-600">{item.unit || 'יח\''}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* כפתורי פעולה צפים */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg flex gap-3 border-t border-gray-800 z-20">
        <button 
          onClick={onBack}
          className="flex-1 bg-gray-900 text-gray-400 p-4 rounded-xl font-bold border border-gray-800 hover:bg-gray-800 transition-all"
        >
          ביטול
        </button>
        <button 
          onClick={() => onSave(formData)}
          className="flex-[2] bg-yellow-500 text-black p-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all"
        >
          שמור עדכון
        </button>
      </div>
    </div>
  );
};
