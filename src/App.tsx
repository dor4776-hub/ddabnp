import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType, EquipmentItem } from './types';
import { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  // --- מנגנון נעילה BNP (ללא משתנים מיותרים) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<EventRecord | null>(null);

// טעינה מהענן של גוגל עם גיבוי מקומי ומערכת שחזור רשימות חכמה
  useEffect(() => {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
  
    const loadData = async () => {
      try {
        // 1. טעינה מקומית ראשונית - כדי שהאפליקציה תעלה מיד
        const saved = localStorage.getItem('eventTrack_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEvents(parsed);
          }
        }
  
        if (!GOOGLE_SCRIPT_URL.startsWith('http')) return;
  
        // 2. משיכה מגוגל שיטס
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
          const formattedEvents = data.map((item: any) => {
            const rawItems = typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []);

            let finalItems = rawItems;

            if (item.type && EVENT_TEMPLATES[item.type as EventType]) {
              const template = EVENT_TEMPLATES[item.type as EventType];
              const savedItemsMap = new Map(rawItems.map((r: any) => [r.name, r]));

              finalItems = template.defaultItems.map((templateItem: any) => {
                const baseItem = templateItem || {}; // <-- הגנה 1: מוודא שהתבנית היא אובייקט
                if (savedItemsMap.has(baseItem.name)) {
                  const savedData = savedItemsMap.get(baseItem.name) || {}; // <-- הגנה 2: מוודא שהנתון השמור הוא אובייקט
                  savedItemsMap.delete(baseItem.name);
                  return { ...baseItem, ...savedData };
                }
                return { ...baseItem };
              });

              savedItemsMap.forEach((customItem: any) => {
                if (customItem) finalItems.push(customItem);
              });
            }

            return {
              ...item,
              items: finalItems,
              createdAt: item.createdAt || Date.now()
            };
          });
          
          setEvents(formattedEvents);
          localStorage.setItem('eventTrack_events', JSON.stringify(formattedEvents));
        }
      } catch (e) {
        console.warn("סנכרון נכשל, משתמשים בגיבוי", e);
      }
    };
  
    loadData();
  }, []);
//  טעינה מהענן של גוגל עם גיבוי מקומי
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

  // --- הגנה: מסך נעילה ---
  if (!isAuthenticated) {
    return (
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
            autoFocus
            onChange={(e) => {
              if (e.target.value === '2026') {
                setIsAuthenticated(true);
              }
            }}
          />
          <p className="text-gray-500 text-xs">הגישה לצוות מורשה בלבד.</p>
        </div>
      </div>
    );
  }

  // --- פונקציות האפליקציה ---
  const downloadConsumptionReport = async (event: EventRecord) => {
    const relevantItems = event.items.filter(item => item.quantityOut > 0 || item.isChecked);
    if (relevantItems.length === 0) return;

    const grouped: Record<string, EquipmentItem[]> = {};
    relevantItems.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    let grandTotal = 0;
    const styles = `
      <style>
        table { border-collapse: collapse; width: 100%; border: 3pt solid #1e3a8a; direction: rtl; }
        th, td { border: 1pt solid #f97316; padding: 8px; text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        th { background-color: #f1f5f9; font-weight: bold; border-bottom: 2pt solid #1e3a8a; }
        .category-row { background-color: #e2e8f0; font-weight: bold; text-align: right; font-size: 12pt; }
        .total-row { background-color: #10b981; color: white; font-weight: bold; font-size: 16pt; height: 40px; }
        .footer-label { background-color: #f8fafc; font-weight: bold; }
      </style>
    `;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        ${styles}
      </head>
      <body dir="rtl">
        <h2 style="text-align: center;">דוח אירוע: ${event.eventName}</h2>
        <p style="text-align: center;">תאריך: ${new Date(event.eventDate).toLocaleDateString('he-IL')} | מנהל: ${event.managerName}</p>
        <table>
          <thead>
            <tr>
              <th>קטגוריה</th><th>שם הפריט</th><th>יצא</th><th>חזר</th><th>נצרך/נעלם</th><th>יחידה</th><th>מחיר ליחידה</th><th>סה״כ עלות</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.entries(grouped).forEach(([category, items]) => {
      html += `<tr><td colspan="8" class="category-row">${category}</td></tr>`;
      items.forEach(item => {
        const diff = item.itemType === 'checkbox' ? (item.isChecked ? 1 : 0) : (item.quantityOut - (item.quantityIn || 0));
        const consumption = Math.max(0, diff);
        const price = item.price || 0;
        const totalCost = consumption * price;
        grandTotal += totalCost;
        html += `
          <tr>
            <td>${item.category}</td>
            <td>${item.name}${item.selectedVariant ? ` (${item.selectedVariant})` : ''}</td>
            <td>${item.itemType === 'checkbox' ? (item.isChecked ? 'V' : '-') : item.quantityOut}</td>
            <td>${item.itemType === 'checkbox' ? '-' : (item.quantityIn || 0)}</td>
            <td>${consumption}</td>
            <td>${item.unit || '-'}</td>
            <td>₪${price.toLocaleString()}</td>
            <td>₪${totalCost.toLocaleString()}</td>
          </tr>
        `;
      });
    });

    html += `</tbody><tfoot><tr><td colspan="7" class="footer-label" style="text-align: left;">סה"כ לתשלום:</td><td class="total-row">₪${grandTotal.toLocaleString()}</td></tr></tfoot></table></body></html>`;

    // 1. הורדה למחשב
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const fileName = `${event.eventName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.xls`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    // 2. שליחה לדרייב
    const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
    const params = new URLSearchParams();
    params.append('fileData', html); 
    params.append('fileName', fileName);
    params.append('eventName', event.eventName);

    try {
      fetch(GOOGLE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      console.log("Sync request sent to Google Drive");
    } catch (err) {
      console.error("Drive sync failed", err);
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

  const handleImportEvent = (importedData: Partial<EventRecord>) => {
    setCurrentDraft({
      id: Math.random().toString(36).substr(2, 9),
      type: 'private',
      eventName: importedData.eventName || 'אירוע מיובא',
      managerName: '',
      eventDate: new Date().toISOString().split('T')[0],
      items: importedData.items || [],
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
    const allReturned = updatedEvent.items.every(item => 
      item.itemType === 'checkbox' ? true : (item.quantityOut === 0 || ((item.quantityIn || 0) >= item.quantityOut))
    );
    
    const eventToSave = {
      ...updatedEvent,
      status: (allReturned && updatedEvent.items.some(i => i.quantityOut > 0 || i.isChecked)) ? 'completed' as const : 'active' as const
    };

    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      if (exists) {
        return prev.map(e => e.id === eventToSave.id ? eventToSave : e);
      }
      return [eventToSave, ...prev];
    });

    downloadConsumptionReport(eventToSave);

    const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
    const params = new URLSearchParams();
    params.append('eventName', eventToSave.eventName);
    params.append('status', eventToSave.status);
    params.append('eventData', JSON.stringify(eventToSave));
    params.append('items', JSON.stringify(eventToSave.items));

    try {
      await fetch(GOOGLE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      console.log("BNP Cloud: Sync Successful");
    } catch (err) {
      console.error("BNP Cloud: Sync Failed", err);
    }

    alert('האירוע נשמר וסונכרן לענן של BNP!');
    setCurrentDraft(null);
    setView('dashboard');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && (
        <Dashboard events={events} onCreateNew={handleCreateNew} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} onImportEvent={handleImportEvent} />
      )}
      {view === 'editor' && currentDraft && (
        <EventForm event={currentDraft} onSave={handleSaveEvent} onBack={() => { setCurrentDraft(null); setView('dashboard'); }} />
      )}
    </Layout>
  );
};

export default App;
