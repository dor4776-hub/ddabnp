import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType } from './types';
import { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<EventRecord | null>(null);

  const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbz-pNg3uGQp6SdnlokxP97BXEW33jdoGjsfiToii3KIcyzknkJ97sVdZlP86B6wEnsC/exec';

  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = localStorage.getItem('eventTrack_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setEvents(parsed);
        }
        
        const response = await fetch(GOOGLE_URL);
        const data = await response.json();
        if (data && Array.isArray(data)) {
          const eventsMap = new Map<string, EventRecord>();
          data.forEach((row: any) => {
            if (row.eventData) {
              try {
                const parsed = typeof row.eventData === 'string' ? JSON.parse(row.eventData) : row.eventData;
                eventsMap.set(parsed.id, parsed);
              } catch (e) {}
            }
          });
          const sorted = Array.from(eventsMap.values()).sort((a, b) => (b as any).createdAt - (a as any).createdAt);
          setEvents(sorted as EventRecord[]);
          localStorage.setItem('eventTrack_events', JSON.stringify(sorted));
        }
      } catch (e) { console.warn("טעינה מהענן נכשלה, עובדים מקומית", e); }
    };
    loadData();
  }, []);

  const restoreToFullTemplate = (savedEvent: any) => {
    const type = (savedEvent.type as EventType) || 'private';
    const template = EVENT_TEMPLATES[type];
    const mergedItems = template.defaultItems.map(tItem => {
      const savedItem = savedEvent.items?.find((i: any) => i.name === tItem.name);
      if (savedItem) {
        return { ...tItem, ...savedItem };
      }
      return { ...tItem };
    });
    return { ...savedEvent, items: mergedItems };
  };

  const handleEditEvent = (id: string) => {
    const eventToEdit = events.find(e => e.id === id);
    if (eventToEdit) {
      const onlyUsedItems = eventToEdit.items.filter(item => 
        (item.quantityOut > 0) || 
        (item.isChecked === true) || 
        ((item.quantityIn || 0) > 0)
      );
      
      setCurrentDraft({
        ...eventToEdit,
        items: onlyUsedItems
      });
      setView('editor');
    }
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
  
  const handleImportEvent = (importedData: any) => {
    const fullEvent = restoreToFullTemplate(importedData);
    setCurrentDraft({
      ...fullEvent,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now()
    });
    setView('editor');
  };

  const handleSaveEvent = async (updatedEvent: EventRecord) => {
    const filteredItems = updatedEvent.items.filter(item => item.quantityOut > 0 || item.isChecked);
    const eventToSave = { 
      ...updatedEvent, 
      items: filteredItems.length > 0 ? filteredItems : updatedEvent.items 
    };

    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      return exists ? prev.map(e => e.id === eventToSave.id ? eventToSave : e) : [eventToSave, ...prev];
    });

    const styles = `<style>table { border-collapse: collapse; width: 100%; border: 3pt solid #1e3a8a; direction: rtl; } th, td { border: 1pt solid #f97316; padding: 8px; text-align: center; font-family: sans-serif; } th { background-color: #f1f5f9; font-weight: bold; }</style>`;
    let rowsHtml = filteredItems.map(item => `<tr><td>${item.category}</td><td>${item.name}</td><td>${item.quantityOut || (item.isChecked ? 'V' : 0)}</td><td>${item.quantityIn || 0}</td></tr>`).join('');
    const fullHtml = `<html><head><meta charset="UTF-8">${styles}</head><body dir="rtl"><h2>BNP דוח אירוע: ${eventToSave.eventName}</h2><table><thead><tr><th>קטגוריה</th><th>פריט</th><th>יצא</th><th>חזר</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventToSave.eventName}.xls`;
    link.click();

    const params = new URLSearchParams();
    params.append('eventData', JSON.stringify(eventToSave));
    params.append('fileData', fullHtml);

    fetch(GOOGLE_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString() 
    }).catch(e => console.error(e));

    alert('האירוע נשמר בהצלחה!');
    setView('dashboard');
    setCurrentDraft(null);
  };

  // דף הכניסה הממותג
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-12">
            <h1 className="text-yellow-500 text-7xl font-black tracking-tighter mb-2 italic">BNP</h1>
            <div className="h-1 w-24 bg-yellow-500 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-400 uppercase tracking-[0.3em] text-xs font-light">Cocktail Bar Service</p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-2xl">
            <h2 className="text-white text-lg mb-8 font-light">הכנס קוד גישה למערכת</h2>
            <input 
              type="password" 
              inputMode="numeric"
              placeholder="••••"
              className="bg-black/50 text-yellow-500 border border-gray-700 p-5 rounded-2xl text-center text-4xl mb-8 w-full focus:border-yellow-500 outline-none tracking-[0.5em] font-mono"
              autoFocus
              onChange={(e) => e.target.value === '2026' && setIsAuthenticated(true)}
            />
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>ניהול מלאי - צוות מורשה בלבד</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // תצוגת האפליקציה לאחר התחברות
  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && (
        <Dashboard 
          events={events} 
          onCreateNew={handleCreateNew} 
          onEditEvent={handleEditEvent} 
          onDeleteEvent={(id) => setEvents(prev => prev.filter(e => e.id !== id))} 
          onImportEvent={handleImportEvent} 
        />
      )}
      {view === 'editor' && currentDraft && (
        <EventForm event={currentDraft} onSave={handleSaveEvent} onBack={() => { setCurrentDraft(null); setView('dashboard'); }} />
      )}
    </Layout>
  );
};

export default App;
