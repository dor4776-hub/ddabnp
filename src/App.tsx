import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType, EquipmentItem } from './types';
import { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<EventRecord | null>(null);

  // הכתובת החדשה מה-Apps Script
  const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbzvG58xkWWJwzGn39pb-X8gN6VuSoCYHdpeK3v5e58sQ1ck_HXtXPpwXNcLs_MPikvu/exec';

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
          const latestEvents = Array.from(eventsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
          setEvents(latestEvents);
          localStorage.setItem('eventTrack_events', JSON.stringify(latestEvents));
        }
      } catch (e) { console.warn(e); }
    };
    loadData();
  }, []);

  const downloadConsumptionReport = async (event: EventRecord) => {
    const relevantItems = event.items.filter(item => item.quantityOut > 0 || item.isChecked);
    const styles = `<style>table { border-collapse: collapse; width: 100%; border: 3pt solid #1e3a8a; direction: rtl; } th, td { border: 1pt solid #f97316; padding: 8px; text-align: center; font-family: sans-serif; } th { background-color: #f1f5f9; font-weight: bold; }</style>`;
    
    let rowsHtml = event.items.map(item => `<tr><td>${item.category}</td><td>${item.name}</td><td>${item.quantityOut || (item.isChecked ? 'V' : 0)}</td><td>${item.quantityIn || 0}</td></tr>`).join('');
    
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8">${styles}</head><body dir="rtl"><h2>דוח אירוע: ${event.eventName}</h2><table><thead><tr><th>קטגוריה</th><th>פריט</th><th>יצא</th><th>חזר</th></tr></thead><tbody>${rowsHtml}</tbody></table><div style="display:none" id="bnp-data">${JSON.stringify(event)}</div></body></html>`;

    // הורדה למחשב
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.eventName}.xls`;
    link.click();

    // שליחה לגוגל
    const params = new URLSearchParams();
    params.append('eventData', JSON.stringify(event));
    params.append('fileData', html);
    fetch(GOOGLE_URL, { method: 'POST', mode: 'no-cors', body: params.toString() }).catch(() => {});
  };

  const handleCreateNew = (type: EventType) => {
    const template = EVENT_TEMPLATES[type];
    setCurrentDraft({ id: Math.random().toString(36).substr(2, 9), type, eventName: '', managerName: '', eventDate: new Date().toISOString().split('T')[0], items: template.defaultItems.map(item => ({ ...item })), status: 'active', createdAt: Date.now() });
    setView('editor');
  };

  const handleImportEvent = (importedData: any) => {
    const type = (importedData.type as EventType) || 'private';
    const template = EVENT_TEMPLATES[type];
    const mergedItems = template.defaultItems.map(tItem => {
      const found = importedData.items?.find((i: any) => i.name === tItem.name);
      return found ? { ...tItem, ...found } : { ...tItem };
    });

    setCurrentDraft({ id: Math.random().toString(36).substr(2, 9), type, eventName: importedData.eventName || 'אירוע מיובא', managerName: importedData.managerName || '', eventDate: new Date().toISOString().split('T')[0], items: mergedItems, status: 'active', createdAt: Date.now() });
    setView('editor');
  };

  const handleSaveEvent = async (updatedEvent: EventRecord) => {
    const filteredItems = updatedEvent.items.filter(item => item.quantityOut > 0 || item.isChecked);
    const eventToSave = { ...updatedEvent, items: filteredItems.length > 0 ? filteredItems : updatedEvent.items };

    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      return exists ? prev.map(e => e.id === eventToSave.id ? eventToSave : e) : [eventToSave, ...prev];
    });

    alert('האירוע נשמר בהצלחה!');
    setView('dashboard');
    setCurrentDraft(null);
    downloadConsumptionReport(eventToSave);
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <h1 className="text-yellow-500 text-4xl font-bold mb-8">BNP</h1>
      <input type="password" placeholder="קוד גישה" className="bg-gray-900 text-white p-4 rounded-xl text-center" onChange={(e) => e.target.value === '2026' && setIsAuthenticated(true)} />
    </div>
  );

  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && <Dashboard events={events} onCreateNew={handleCreateNew} onEditEvent={(id) => { const e = events.find(ev => ev.id === id); if(e) { setCurrentDraft(e); setView('editor'); } }} onDeleteEvent={(id) => setEvents(prev => prev.filter(e => e.id !== id))} onImportEvent={handleImportEvent} />}
      {view === 'editor' && currentDraft && <EventForm event={currentDraft} onSave={handleSaveEvent} onBack={() => { setCurrentDraft(null); setView('dashboard'); }} />}
    </Layout>
  );
};

export default App;
