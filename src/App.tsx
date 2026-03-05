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

  const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycbyPGcrElfhcR1F9O3zaOg5jJj0Nzga8hrJkqz6dOEdOHm78CefRSu_onqLhYvsTHEcz/exec';

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

  // פונקציה שמייצרת את הקובץ המעוצב (זהה למחשב ולדרייב)
  const generateStyledReport = (event: EventRecord) => {
    const relevantItems = event.items.filter(item => item.quantityOut > 0 || item.isChecked);
    
    const styles = `
      <style>
        table { border-collapse: collapse; width: 100%; border: 3pt solid #1e3a8a; direction: rtl; }
        th, td { border: 1pt solid #f97316; padding: 8px; text-align: center; font-family: sans-serif; }
        th { background-color: #f1f5f9; font-weight: bold; border-bottom: 2pt solid #1e3a8a; }
        .category-row { background-color: #e2e8f0; font-weight: bold; text-align: right; }
        .total-row { background-color: #10b981; color: white; font-weight: bold; font-size: 14pt; }
      </style>
    `;

    let tableRows = '';
    let grandTotal = 0;

    relevantItems.forEach(item => {
      const consumption = item.itemType === 'checkbox' ? (item.isChecked ? 1 : 0) : (item.quantityOut - (item.quantityIn || 0));
      const totalCost = Math.max(0, consumption) * (item.price || 0);
      grandTotal += totalCost;

      tableRows += `
        <tr>
          <td>${item.category}</td>
          <td>${item.name}</td>
          <td>${item.quantityOut || (item.isChecked ? 'V' : 0)}</td>
          <td>${item.quantityIn || 0}</td>
          <td>${Math.max(0, consumption)}</td>
          <td>₪${(item.price || 0).toLocaleString()}</td>
          <td>₪${totalCost.toLocaleString()}</td>
        </tr>
      `;
    });

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">${styles}</head>
      <body>
        <h2 style="text-align:center">BNP Cocktail Bar - דוח אירוע: ${event.eventName}</h2>
        <table>
          <thead>
            <tr>
              <th>קטגוריה</th><th>פריט</th><th>יצא</th><th>חזר</th><th>נצרך</th><th>מחיר</th><th>סה"כ</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr><td colspan="6" style="text-align:left">סה"כ לתשלום:</td><td class="total-row">₪${grandTotal.toLocaleString()}</td></tr>
          </tfoot>
        </table>
        <div style="display:none" id="bnp-metadata">${JSON.stringify(event)}</div>
      </body>
      </html>
    `;
  };

  const handleSaveEvent = async (updatedEvent: EventRecord) => {
    // 1. סינון פריטים
    const filteredItems = updatedEvent.items.filter(item => item.quantityOut > 0 || item.isChecked);
    const eventToSave = { ...updatedEvent, items: filteredItems.length > 0 ? filteredItems : updatedEvent.items };

    // 2. עדכון מקומי
    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      return exists ? prev.map(e => e.id === eventToSave.id ? eventToSave : e) : [eventToSave, ...prev];
    });

    // 3. יצירת הקובץ המעוצב
    const reportHtml = generateStyledReport(eventToSave);

    // 4. הורדה למחשב (קובץ מעוצב)
    const blob = new Blob([reportHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventToSave.eventName}.xls`;
    link.click();

    // 5. שליחה לדרייב (אותו קובץ בדיוק!)
    const params = new URLSearchParams();
    params.append('eventName', eventToSave.eventName);
    params.append('eventData', JSON.stringify(eventToSave));
    params.append('fileData', reportHtml); // שליחת העיצוב לדרייב

    fetch(GOOGLE_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      body: params.toString() 
    }).catch(e => console.error(e));

    alert('האירוע נשמר! הדוח המעוצב יורד למכשיר וסונכרן לדרייב.');
    setView('dashboard');
    setCurrentDraft(null);
  };

  const handleCreateNew = (type: EventType) => {
    const template = EVENT_TEMPLATES[type];
    setCurrentDraft({ id: Math.random().toString(36).substr(2, 9), type, eventName: '', managerName: '', eventDate: new Date().toISOString().split('T')[0], items: template.defaultItems.map(item => ({ ...item })), status: 'active', createdAt: Date.now() });
    setView('editor');
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <h1 className="text-yellow-500 text-4xl font-bold mb-8">BNP</h1>
      <input type="password" placeholder="קוד גישה" className="bg-gray-900 text-white p-4 rounded-xl text-center" onChange={(e) => e.target.value === '2026' && setIsAuthenticated(true)} />
    </div>
  );

  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && <Dashboard events={events} onCreateNew={handleCreateNew} onEditEvent={(id) => { const e = events.find(ev => ev.id === id); if(e) { setCurrentDraft(e); setView('editor'); } }} onDeleteEvent={(id) => setEvents(prev => prev.filter(e => e.id !== id))} onImportEvent={(data) => { setCurrentDraft({...data as EventRecord, id: Math.random().toString(36).substr(2, 9)}); setView('editor'); }} />}
      {view === 'editor' && currentDraft && <EventForm event={currentDraft} onSave={handleSaveEvent} onBack={() => { setCurrentDraft(null); setView('dashboard'); }} />}
    </Layout>
  );
};

export default App;
