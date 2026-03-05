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
      {/* כותרת האירוע */}
      <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <h2 className="text-yellow-500 font-bold text-2xl mb-1">
          {formData.eventName || 'אירוע חדש'}
        </h2>
        <div className="flex justify-between items-center text-gray-400 text-sm">
          <span>{new Date(formData.eventDate).toLocaleDateString('he-IL')}</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full text-xs border border-gray-700">
            {formData.items.length} פריטים בדוח
          </span>
        </div>
      </div>

      {/* רשימת הפריטים (תוצג בדיוק כפי שהיא נשלחה לטופס) */}
      <div className="grid gap-3">
        {formData.items.map(item => (
          <div key={item.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between shadow-sm">
            <div className="flex-1">
              <p className="text-white font-medium">{item.name}</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">{item.category}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {item.itemType === 'number' ? (
                <>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-500 mb-1 font-bold">יצא</span>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={item.quantityOut || ''} 
                      placeholder="0"
                      onChange={(e) => handleItemChange(item.id, 'quantityOut', parseInt(e.target.value) || 0)}
                      className="w-14 bg-black border border-gray-700 text-white text-center p-2 rounded-lg focus:border-yellow-500 outline-none text-sm"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-500 mb-1 font-bold text-green-500">חזר</span>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={item.quantityIn || ''} 
                      placeholder="0"
                      onChange={(e) => handleItemChange(item.id, 'quantityIn', parseInt(e.target.value) || 0)}
                      className="w-14 bg-gray-800 border border-gray-700 text-white text-center p-2 rounded-lg focus:border-yellow-500 outline-none text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center px-2">
                  <span className="text-[9px] text-gray-500 mb-1 font-bold italic text-yellow-500">V</span>
                  <input 
                    type="checkbox" 
                    checked={item.isChecked}
                    onChange={(e) => handleItemChange(item.id, 'isChecked', e.target.checked)}
                    className="w-6 h-6 accent-yellow-500"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* כפתורי שמירה בתחתית */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md flex gap-3 border-t border-gray-800">
        <button onClick={onBack} className="flex-1 bg-gray-900 text-gray-400 p-4 rounded-xl font-bold border border-gray-700">ביטול</button>
        <button onClick={() => onSave(formData)} className="flex-[2] bg-yellow-500 text-black p-4 rounded-xl font-bold shadow-lg">שמור עדכון</button>
      </div>
    </div>
  );
};
