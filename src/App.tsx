import  React, { useState, useEffect } from 'react';
import  { Layout } from './components/Layout';
import  { Dashboard } from './components/Dashboard';
import  { EventForm } from './components/EventForm';
import type { EventRecord, EventType, EquipmentItem } from './types';
import  { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<EventRecord | null>(null);

  // טעינה מהזיכרון המקומי בעליה
  // טעינה מהענן של גוגל עם גיבוי מקומי
  useEffect(() => {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
  
    const loadData = async () => {
      try {
        // 1. קודם כל - טעינה מהזיכרון של הטלפון כדי שהאפליקציה תעלה מיד ולא תקרוס
        const saved = localStorage.getItem('eventTrack_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEvents(parsed);
          }
        }
  
        // 2. עכשיו מנסים לעדכן מגוגל
        if (!GOOGLE_SCRIPT_URL.startsWith('http')) return;
  
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        // 3. רק אם הנתונים מגוגל תקינים - אנחנו מעדכנים את המסך
        if (data && Array.isArray(data) && data.length > 0) {
          const formattedEvents = data.map((item: any) => ({
            ...item,
            // מוודא שה-items הוא מערך ולא נשבר
            items: typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []),
            createdAt: item.createdAt || Date.now()
          }));
          
          setEvents(formattedEvents);
          localStorage.setItem('eventTrack_events', JSON.stringify(formattedEvents));
        }
      } catch (e) {
        console.warn("סנכרון נכשל, משתמשים בנתונים מקומיים בלבד", e);
        // אם יש שגיאה - האפליקציה לא עושה כלום ולא קורסת
      }
    };
  
    loadData();
  }, []);
  // שמירה לזיכרון המקומי בכל שינוי
  useEffect(() => {
    localStorage.setItem('eventTrack_events', JSON.stringify(events));
  }, [events]);

  // פונקציית העזר לייצור הדוח, הורדה ושליחה לדרייב
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

    // --- 1. הורדה למחשב ---
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const fileName = `${event.eventName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.xls`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    // --- 2. שליחה לדרייב (Google Drive Sync) ---
    // הקישור המעודכן שלך:
    const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
    
    const params = new URLSearchParams();
    params.append('fileData', html); 
    params.append('fileName', fileName);
    params.append('eventName', event.eventName);

    try {
      // שליחה ב-no-cors כדי למנוע חסימות דפדפן
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
    // 1. בדיקה אם כל הציוד חזר (כדי לקבוע סטטוס "הושלם" או "פעיל")
    const allReturned = updatedEvent.items.every(item => 
      item.itemType === 'checkbox' ? true : (item.quantityOut === 0 || ((item.quantityIn || 0) >= item.quantityOut))
    );
    
    const eventToSave = {
      ...updatedEvent,
      status: (allReturned && updatedEvent.items.some(i => i.quantityOut > 0 || i.isChecked)) ? 'completed' as const : 'active' as const
    };

    // 2. עדכון מיידי של הרשימה באפליקציה (בשביל המהירות)
    setEvents(prev => {
      const exists = prev.find(e => e.id === eventToSave.id);
      if (exists) {
        return prev.map(e => e.id === eventToSave.id ? eventToSave : e);
      }
      return [eventToSave, ...prev];
    });

    // 3. הפקת דוח אקסל והורדה (הפונקציה שכתבנו קודם)
    downloadConsumptionReport(eventToSave);

    // 4. סנכרון לענן של BNP
    const GOOGLE_URL = 'https://script.google.com/macros/s/AKfycby7I4Iv-XieA9GdwD5DDqMjMmMqM9SkJ33Yn3lAlKrC4rmQKosls1WFiXQSzhT2dFv1/exec';
    
    const params = new URLSearchParams();
    params.append('eventName', eventToSave.eventName);
    params.append('status', eventToSave.status);
    params.append('eventData', JSON.stringify(eventToSave)); // כל האובייקט לגיבוי
    params.append('items', JSON.stringify(eventToSave.items)); // רשימת הציוד בנפרד למקרה שנרצה לקרוא אותה בטבלה

    try {
      // שליחה ב-POST
      await fetch(GOOGLE_URL, {
        method: 'POST',
        mode: 'no-cors', // מאפשר שליחה גם אם יש בעיות אבטחה בדפדפן
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      console.log("BNP Cloud: Sync Successful");
    } catch (err) {
      console.error("BNP Cloud: Sync Failed", err);
    }

    // חזרה לדאשבורד
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
