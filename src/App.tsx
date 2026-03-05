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

  // הכתובת המעודכנת ששלחת
  const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbz-pNg3uGQp6SdnlokxP97BXEW33jdoGjsfiToii3KIcyzknkJ97sVdZlP86B6wEnsC/exec';

  // טעינת נתונים ראשונית (משיכה מגוגל ועדכון הזיכרון המקומי)
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

  // פונקציית הקסם: משחזרת אירוע "רזה" לתבנית המלאה של BNP
  const restoreToFullTemplate = (savedEvent: any) => {
    const type = (savedEvent.type as EventType) || 'private';
    const template = EVENT_TEMPLATES[type];
    
    // עוברים על כל פריטי התבנית המקוריים
    const mergedItems = template.defaultItems.map(tItem => {
      // מחפשים אם הפריט הזה היה קיים בשמירה
      const savedItem = savedEvent.items?.find((i: any) => i.name === tItem.name);
      if (savedItem) {
        return { ...tItem, ...savedItem }; // מחזירים את הפריט עם הכמויות שנשמרו
      }
      return { ...tItem }; // מחזירים פריט ריק מהתבנית
    });

    return { ...savedEvent, items: mergedItems };
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
      setCurrentDraft(restoreToFullTemplate(eventToEdit));
      setView('editor');
    }
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
    // שומרים רק את מה שיצא או סומן (לחיסכון במקום ב-Sheets)
    const filteredItems = updatedEvent.items.filter(item => item.quantityOut > 0 || item.isChecked);
    const eventToSave = { 
      ...updatedEvent, 
      items: filteredItems.length > 0 ? filteredItems : updatedEvent.items 
    };

    // 1. עדכון מצב האפליקציה (UI)
    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      return exists ? prev.map(e => e.id === eventToSave.id ? eventToSave : e) : [eventToSave, ...prev];
    });

    // 2. יצירת דוח HTML מעוצב (כמו שיורד למחשב)
    const styles = `<style>table { border-collapse: collapse; width: 100%; border: 3pt solid #1e3a8a; direction: rtl; } th, td { border: 1pt solid #f97316; padding: 8px; text-align: center; font-family: sans-serif; } th { background-color: #f1f5f9; font-weight: bold; }</style>`;
    let rowsHtml = filteredItems.map(item => `<tr><td>${item.category}</td><td>${item.name}</td><td>${item.quantityOut || (item.isChecked ? 'V' : 0)}</td><td>${item.quantityIn || 0}</td></tr>`).join('');
    const fullHtml = `<html><head><meta charset="UTF-8">${styles}</head><body dir="rtl"><h2>BNP דוח אירוע: ${eventToSave.eventName}</h2><table><thead><tr><th>קטגוריה</th><th>פריט</th><th>יצא</th><th>חזר</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

    // 3. הורדה פיזית למכשיר
    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventToSave.eventName}.xls`;
    link.click();

    // 4. שליחה לדרייב ולשיטס (דרך הסקריפט)
    const params = new URLSearchParams();
    params.append('eventData', JSON.stringify(eventToSave));
    params.append('fileData', fullHtml);

    fetch(GOOGLE_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString() 
    }).catch(e => console.error(e));

    alert('האירוע נשמר! הנתונים סונכרנו והדוח נשלח לדרייב.');
    setView('dashboard');
    setCurrentDraft(null);
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <h1 className="text-yellow-500 text-4xl font-bold mb-8">BNP</h1>
      <input 
        type="password" 
        placeholder="קוד גישה" 
        className="bg-gray-900 text-white p-4 rounded-xl text-center outline-none border border-gray-700 focus:border-yellow-500" 
        onChange={(e) => e.target.value === '2026' && setIsAuthenticated(true)} 
      />
    </div>
  );

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
