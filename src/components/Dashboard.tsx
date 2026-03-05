
import React, { useMemo, useState, useRef } from 'react';
import { EVENT_TEMPLATES } from '../constants';
import type { EventRecord, EventType, EquipmentItem } from '../types';
import { Plus, Calendar, User, ChevronLeft, Search, Trash2, Upload } from 'lucide-react';

interface DashboardProps {
  events: EventRecord[];
  onCreateNew: (type: EventType) => void;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onImportEvent: (importedEvent: Partial<EventRecord>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ events, onCreateNew, onEditEvent, onDeleteEvent, onImportEvent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEvents = useMemo(() => {
    return events.filter(e => 
      e.eventName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.managerName.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [events, searchTerm]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      
      // Extract Event Name from H2
      const eventName = doc.querySelector('h2')?.textContent?.replace('דוח אירוע: ', '') || 'אירוע מיובא';
      
      // Extract rows from table
      const rows = Array.from(doc.querySelectorAll('table tbody tr'));
      const items: EquipmentItem[] = [];

      rows.forEach(row => {
        // Fix: Cast generic Element to HTMLTableRowElement to access the 'cells' property
        const tableRow = row as HTMLTableRowElement;
        // Skip category header rows (they have colspan or class category-row)
        if (tableRow.querySelector('.category-row') || tableRow.cells.length < 8) return;

        const category = tableRow.cells[0].textContent?.trim() || 'כללי';
        let nameWithVariant = tableRow.cells[1].textContent?.trim() || '';
        const outStr = tableRow.cells[2].textContent?.trim() || '0';
        const unit = tableRow.cells[5].textContent?.trim() || '';
        const priceStr = tableRow.cells[6].textContent?.replace('₪', '').replace(',', '').trim() || '0';

        // Detect variant
        let name = nameWithVariant;
        let selectedVariant = '';
        const variantMatch = nameWithVariant.match(/\((.*)\)$/);
        if (variantMatch) {
          selectedVariant = variantMatch[1];
          name = nameWithVariant.replace(` (${selectedVariant})`, '');
        }

        const isCheckbox = outStr === 'V';
        
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          name,
          category,
          quantityOut: isCheckbox ? (outStr === 'V' ? 1 : 0) : parseInt(outStr) || 0,
          quantityIn: 0,
          itemType: isCheckbox ? 'checkbox' : (selectedVariant ? 'select' : 'count'),
          isChecked: isCheckbox && outStr === 'V',
          selectedVariant: selectedVariant || undefined,
          unit: unit === '-' ? undefined : unit,
          price: parseFloat(priceStr) || 0,
        });
      });

      if (items.length > 0) {
        onImportEvent({
          eventName: `${eventName} (משוחזר)`,
          items
        });
      } else {
        alert('לא הצחלנו למצוא פריטים בקובץ. וודא שזהו קובץ אקסל שהופק מהמערכת.');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Hero Section - New Event */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Plus className="text-indigo-600" />
            צור אירוע חדש
          </h2>
          
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xls,.html" 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-medium text-sm"
            >
              <Upload size={18} className="text-indigo-600" />
              ייבוא דוח קיים
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(EVENT_TEMPLATES).map((template) => (
            <button
              key={template.id}
              onClick={() => onCreateNew(template.id as EventType)}
              className="group relative flex flex-col items-center justify-center p-8 bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-lg transition-all duration-300 text-center"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                {template.id === 'wedding' && <span className="text-3xl">💍</span>}
                {template.id === 'corporate' && <span className="text-3xl">🏢</span>}
                {template.id === 'private' && <span className="text-3xl">🎉</span>}
              </div>
              <h3 className="text-lg font-bold text-slate-800">{template.label}</h3>
              <p className="text-sm text-slate-500 mt-2">לחץ לפתיחת רשימה חדשה</p>
            </button>
          ))}
        </div>
      </section>

      {/* History / Active Events */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">היסטוריית אירועים</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="חיפוש לפי שם או מנהל..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>לא נמצאו אירועים במערכת</p>
            </div>
          ) : (
            filteredEvents.map(event => (
              <div 
                key={event.id} 
                className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div 
                  className="flex-grow cursor-pointer"
                  onClick={() => onEditEvent(event.id)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      event.status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {event.status === 'completed' ? 'הושלם' : 'פעיל'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(event.eventDate).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {event.eventName}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {event.managerName}
                    </span>
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 rounded">
                      {EVENT_TEMPLATES[event.type]?.label || event.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) {
                        onDeleteEvent(event.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="מחק אירוע"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => onEditEvent(event.id)}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                  >
                    פתח טופס
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
