import React, { useState, useEffect } from 'react';
// @ts-ignore
import * as XLSX from 'xlsx';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType } from './types'; // הסרתי את EquipmentItem
import { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<EventRecord | null>(null);

  useEffect(() => {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
    const loadData = async () => {
      try {
        const saved = localStorage.getItem('eventTrack_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setEvents(parsed);
        }
        if (!GOOGLE_SCRIPT_URL.startsWith('http')) return;
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        if (data && Array.isArray(data)) {
          const eventsMap = new Map();
          data.forEach((row: any) => {
            if (row.eventData) {
              try {
                const parsed = typeof row.eventData === 'string' ? JSON.parse(row.eventData) : row.eventData;
                eventsMap.set(parsed.id, parsed);
              } catch(e) {}
            }
          });
          const sorted = Array.from(eventsMap.values()).sort((a, b) => (b as any).createdAt - (a as any).createdAt);
          setEvents(sorted as EventRecord[]);
          localStorage.setItem('eventTrack_events', JSON.stringify(sorted));
        }
      } catch (e) { console.warn(e); }
    };
    loadData();
  }, []);

  const downloadConsumptionReport = (event: EventRecord) => {
    const dataForExcel = event.items
      .filter(item => item.quantityOut > 0 || item.isChecked)
      .map(item => ({
        'קטגוריה': item.category,
        'שם הפריט': item.name + (item.selectedVariant ? ` (${item.selectedVariant})` : ''),
        'יצא': item.itemType === 'checkbox' ? (item.isChecked ? 'V' : '-') : item.quantityOut,
        'חזר': item.itemType === 'checkbox' ? '-' : (item.quantityIn || 0),
        'נצרך': Math.max(0, (item.quantityOut || 0) - (item.quantityIn || 0)),
        'מחיר ליחידה': item.price || 0,
        'סה"כ עלות': (Math.max(0, (item.quantityOut || 0) - (item.quantityIn || 0))) * (item.price || 0)
      }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BNP Report");

    XLSX.writeFile(workbook, `${event.eventName}_${new Date().toLocaleDateString('he-IL')}.xlsx`);
    
    const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
    const params = new URLSearchParams();
    params.append('eventName', event.eventName);
    params.append('eventData', JSON.stringify(event));
    fetch(GOOGLE_URL, { method: 'POST', mode: 'no-cors', body: params.toString() }).catch(() => {});
  };

  const handleSaveEvent = async (updatedEvent: EventRecord) => {
    setEvents(prev => {
      const exists = prev.find(e => e.id === updatedEvent.id);
      const newList = exists ? prev.map(e => e.id === updatedEvent.id ? updatedEvent : e) : [updatedEvent, ...prev];
      return newList;
    });
    downloadConsumptionReport(updatedEvent);
    alert('האירוע נשמר כקובץ אקסל וסונכרן!');
    setCurrentDraft(null);
    setView('dashboard');
  };

  const handleCreateNew = (type: EventType) => {
    const template = EVENT_TEMPLATES[type];
    setCurrentDraft({
      id: Math.random().toString(36).substr(2, 9),
      type,
      eventName: '',
      managerName: '',
      eventDate: new Date().toISOString().split('T')[0],
      items: template.defaultItems.map(item => ({ ...item })),
      status: 'active',
      createdAt: Date.now(),
    });
    setView('editor');
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="mb-8">
        <h1 className="text-yellow-500 text-4xl font-bold tracking-widest mb-2">BNP</h1>
        <p className="text-gray-400 uppercase tracking-widest text-sm">Cocktail Bar Service</p>
      </div>
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-sm">
        <h2 className="text-white text-xl mb-6 font-semibold">כניסת צוות</h2>
        <input 
          type="password" 
          placeholder="הכנס קוד גישה"
          className="bg-black text-white border border-gray-700 p-4 rounded-xl text-center text-2xl mb-6 w-full focus:border-yellow-500 outline-none transition-all"
          onChange={(e) => { if (e.target.value === '2026') setIsAuthenticated(true); }}
        />
      </div>
    </div>
  );

  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && (
        <Dashboard 
          events={events} 
          onCreateNew={handleCreateNew} 
          onEditEvent={(id) => { const e = events.find(ev => ev.id === id); if(e) { setCurrentDraft(e); setView('editor'); } }} 
          onDeleteEvent={(id) => setEvents(prev => prev.filter(e => e.id !== id))} 
          onImportEvent={(data) => { 
            const imported = data as EventRecord;
            setCurrentDraft({...imported, id: Math.random().toString(36).substr(2, 9)}); 
            setView('editor'); 
          }} 
        />
      )}
      {view === 'editor' && currentDraft && (
        <EventForm event={currentDraft} onSave={handleSaveEvent} onBack={() => { setCurrentDraft(null); setView('dashboard'); }} />
      )}
    </Layout>
  );
};

export default App;
