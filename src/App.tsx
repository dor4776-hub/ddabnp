import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType, EquipmentItem } from './types';
import { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  // --- מנגנון נעילה BNP ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  // -------------------------

  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<EventRecord | null>(null);

  // טעינה מהענן של גוגל עם גיבוי מקומי
  useEffect(() => {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
  
    const loadData = async () => {
      try {
        const saved = localStorage.getItem('eventTrack_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEvents(parsed);
          }
        }
  
        if (!GOOGLE_SCRIPT_URL.startsWith('http')) return;
  
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
          const formattedEvents = data.map((item: any) => ({
            ...item,
            items: typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []),
            createdAt: item.createdAt || Date.now()
          }));
          
          setEvents(formattedEvents);
          localStorage.setItem('eventTrack_events', JSON.stringify(formattedEvents));
        }
      } catch (e) {
        console.warn("סנכרון נכשל, משתמשים בנתונים מקומיים בלבד", e);
      }
    };
  
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('eventTrack_events', JSON.stringify(events));
  }, [events]);

  // --- הגנה: אם המשתמש לא מחובר, מציגים מסך נעילה ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="mb-8">
          <h1 className="text-gold text-4xl font-bold tracking-widest mb-2">BNP</h1>
          <p className="text-gray-400 uppercase tracking-widest text-sm">Cocktail Bar Service</p>
        </div>
        
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-sm">
          <h2 className="text-white text-xl mb-6 font-semibold">כניסת צוות</h2>
          <input 
            type="password" 
            placeholder="הכנס קוד גישה"
            className="bg-black text-white border border-gray-700 p-4 rounded-xl text-center text-2xl mb-6 w-full focus:border-gold outline-none transition-all"
            autoFocus
            onChange={(e) => {
              if (e.target.value === '2026') {
                setIsAuthenticated(true);
              }
              setPasscode(e.target.value);
            }}
          />
          <p className="text-gray-500 text-xs">הגישה לצוות מורשה בלבד. המערכת מנטרת כניסות.</p>
        </div>
      </div>
    );
  }

  // --- פונקציות האפליקציה (נשארות כפי שהיו) ---
  const downloadConsumptionReport = async (event: EventRecord) => {
    const relevantItems = event.items.filter(item => item.quantityOut > 0 || item.isChecked);
    if (relevantItems.length === 0) return;
    const grouped: Record<string, EquipmentItem[]> = {};
    relevantItems.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    let grandTotal = 0;
    const styles = `<style>table { border-collapse: collapse; width: 100%; border: 3pt solid #1e3a8a; direction: rtl; } th, td { border: 1pt solid #f97316; padding: 8px; text-align: center; font-family: sans-serif; } th { background-color: #f1f5f9; font-weight: bold; } .total-row { background-color: #10b981; color: white; font-weight: bold; font-size: 16pt; }</style>`;
    let html = `<html dir="rtl"><head><meta charset="UTF-8"/>${styles}</head><body><h2 style="text-align: center;">דוח אירוע: ${event.eventName}</h2><table><thead><tr><th>קטגוריה</th><th>שם הפריט</th><th>יצא</th><th>נצרך</th><th>מחיר</th><th>סה״כ</th></tr></thead><tbody>`;
    Object.entries(grouped).forEach(([category, items]) => {
      items.forEach(item => {
        const consumption = item.itemType === 'checkbox' ? (item.isChecked ? 1 : 0) : (item.quantityOut - (item.quantityIn || 0));
        const totalCost = consumption * (item.price || 0);
        grandTotal += totalCost;
        html += `<tr><td>${category}</td><td>${item.name}</td><td>${item.quantityOut}</td><td>${consumption}</td><td>₪${item.price}</td><td>₪${totalCost}</td></tr>`;
      });
    });
    html += `</tbody><tfoot><tr><td colspan="5">סה"כ:</td><td class="total-row">₪${grandTotal}</td></tr></tfoot></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const fileName = `${event.eventName}_Report.xls`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
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

  const handleEditEvent = (id: string) => {
    const eventToEdit = events.find(e => e.id === id);
    if (eventToEdit) {
      setCurrentDraft(eventToEdit);
      setView('editor');
    }
  };

  const handleSaveEvent = async (updatedEvent: EventRecord) => {
    const allReturned = updatedEvent.items.every(item => item.itemType === 'checkbox' ? true : (item.quantityOut === 0 || ((item.quantityIn || 0) >= item.quantityOut)));
    const eventToSave = { ...updatedEvent, status: (allReturned) ? 'completed' as const : 'active' as const };

    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      if (exists) return prev.map(e => e.id === eventToSave.id ? eventToSave : e);
      return [eventToSave, ...prev];
    });

    downloadConsumptionReport(eventToSave);
    alert('האירוע נשמר!');
    setCurrentDraft(null);
    setView('dashboard');
  };

  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && (
        <Dashboard events={events} onCreateNew={handleCreateNew} onEditEvent={handleEditEvent} onDeleteEvent={(id) => setEvents(prev => prev.filter(e => e.id !== id))} onImportEvent={() => {}} />
      )}
      {view === 'editor' && currentDraft && (
        <EventForm event={currentDraft} onSave={handleSaveEvent} onBack={() => { setCurrentDraft(null); setView('dashboard'); }} />
      )}
    </Layout>
  );
};

export default App;
