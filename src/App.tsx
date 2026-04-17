import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType } from './types';
import { EVENT_TEMPLATES, CATEGORIES } from './constants';
import { fetchAllEvents, saveEvent, deleteEvent, closeEvent } from './services/supabaseService';
import { exportEventToExcel, buildEventWorkbook, buildTaskWorkbook } from './utils/excelExport';
import { uploadEventToDrive, driveConfigured } from './services/driveService';
import { FIRST_VISIT_PHASES, SECOND_VISIT_PHASES } from './constants/taskTemplates';

// Categories whose items are consumables — not expected to be returned
const CONSUMABLE_CATS = new Set([
  CATEGORIES.DRINKS, CATEGORIES.CONSUMABLES,
  CATEGORIES.VODKA,  CATEGORIES.WHISKEY, CATEGORIES.GIN,
  CATEGORIES.TEQUILA, CATEGORIES.RUM,   CATEGORIES.ANISE,
  CATEGORIES.APERITIF, CATEGORIES.BEER,  CATEGORIES.WINE,
]);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view,            setView]            = useState<'dashboard' | 'editor'>('dashboard');
  const [events,          setEvents]          = useState<EventRecord[]>([]);
  const [currentDraft,    setCurrentDraft]    = useState<EventRecord | null>(null);
  const [isSaving,        setIsSaving]        = useState(false);

  // ── Load data (Supabase first, localStorage fallback) ──────────────────
  useEffect(() => {
    const load = async () => {
      const cached = localStorage.getItem('bnp_events');
      if (cached) {
        try { setEvents(JSON.parse(cached)); } catch { /* ignore */ }
      }
      try {
        const remote = await fetchAllEvents();
        setEvents(remote);
        localStorage.setItem('bnp_events', JSON.stringify(remote));
      } catch (e) {
        console.warn('Supabase fetch failed, using local cache:', e);
      }
    };
    load();
  }, []);

  const persistLocally = (updated: EventRecord[]) =>
    localStorage.setItem('bnp_events', JSON.stringify(updated));

  // ── Restore template items when opening an old saved event ─────────────
  const restoreToFullTemplate = (savedEvent: EventRecord): EventRecord => {
    const template = EVENT_TEMPLATES[savedEvent.type];
    if (!template) return savedEvent;
    const mergedItems = template.defaultItems.map(tItem => {
      const saved = savedEvent.items.find(i => i.name === tItem.name);
      return saved ? { ...tItem, ...saved } : { ...tItem };
    });
    return { ...savedEvent, items: mergedItems };
  };

  // ── Navigation ─────────────────────────────────────────────────────────
  const handleEditEvent = (id: string) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;

    if (ev.status === 'active') {
      // Draft — restore full template so user can add/change items
      setCurrentDraft(restoreToFullTemplate(ev));
    } else {
      // Ready or completed — show only items that actually went out
      const usedItems = ev.items.filter(
        item => item.quantityOut > 0 || item.isChecked
      );
      setCurrentDraft({ ...ev, items: usedItems });
    }
    setView('editor');
  };

  const handleCreateNew = (type: EventType) => {
    const template = EVENT_TEMPLATES[type];
    setCurrentDraft({
      id:          Math.random().toString(36).slice(2, 11),
      type,
      eventName:   '',
      managerName: '',
      eventDate:   new Date().toISOString().split('T')[0],
      items:       template.defaultItems.map(item => ({ ...item })),
      status:      'active',
      createdAt:   Date.now(),
    });
    setView('editor');
  };

  const handleImportEvent = (importedData: Partial<EventRecord>) => {
    const type  = (importedData.type as EventType) || 'private';
    const template = EVENT_TEMPLATES[type];
    const mergedItems = template.defaultItems.map(tItem => {
      const saved = importedData.items?.find(i => i.name === tItem.name);
      return saved ? { ...tItem, ...saved } : { ...tItem };
    });
    setCurrentDraft({
      ...(importedData as EventRecord),
      id:        Math.random().toString(36).slice(2, 11),
      items:     mergedItems,
      createdAt: Date.now(),
    });
    setView('editor');
  };

  // ── Shared save helper ─────────────────────────────────────────────────
  const persistEvent = (updatedEvent: EventRecord) => {
    setEvents(prev => {
      const exists = prev.some(e => e.id === updatedEvent.id);
      const next   = exists
        ? prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
        : [updatedEvent, ...prev];
      persistLocally(next);
      return next;
    });
  };

  // ── שמור טיוטה — saves as-is, stays on dashboard ──────────────────────
  const handleSaveDraft = async (updatedEvent: EventRecord) => {
    setIsSaving(true);
    const draft = { ...updatedEvent, status: 'active' as const };
    try {
      await saveEvent(draft);
    } catch (e) {
      console.error('Supabase save failed, using local:', e);
    }
    persistEvent(draft);
    setIsSaving(false);
    alert('טיוטה נשמרה! ✏️');
    setCurrentDraft(null);
    setView('dashboard');
  };

  // ── רשמ"צ מוכן — save only used items, status → ready ─────────────────
  const handleMarkReady = async (updatedEvent: EventRecord) => {
    setIsSaving(true);
    const usedItems = updatedEvent.items.filter(
      item => item.quantityOut > 0 || item.isChecked
    );
    const readyEvent: EventRecord = {
      ...updatedEvent,
      items:  usedItems,
      status: 'ready',
    };
    try {
      await saveEvent(readyEvent);
    } catch (e) {
      console.error('Supabase save failed, using local:', e);
    }
    persistEvent(readyEvent);
    setIsSaving(false);
    alert('רשמ"צ נשמר! הציוד יצא לאירוע 🚀');
    setCurrentDraft(null);
    setView('dashboard');
  };

  // ── Close Event — verify returns, then mark completed + export Excel ────
  const handleCloseEvent = async (eventToClose: EventRecord) => {
    // Find physical items (not consumables, not fees) that weren't returned
    const missingItems = eventToClose.items.filter(item =>
      item.quantityOut > 0 &&
      item.quantityIn < item.quantityOut &&
      !item.isChecked &&
      !item.isFlatFee &&
      !CONSUMABLE_CATS.has(item.category) &&
      item.category !== CATEGORIES.ADDITIONAL_COSTS &&
      item.category !== CATEGORIES.EMPLOYEES
    );

    if (missingItems.length > 0) {
      const lines = missingItems.map(i =>
        `• ${i.name}: יצא ${i.quantityOut}, חזר ${i.quantityIn} (חסר ${i.quantityOut - i.quantityIn})`
      ).join('\n');
      const ok = window.confirm(
        `⚠️ הפריטים הבאים עדיין לא הוחזרו:\n\n${lines}\n\nהאם לסגור את האירוע בכל זאת?`
      );
      if (!ok) return;
    }

    setIsSaving(true);
    const closedEvent: EventRecord = { ...eventToClose, status: 'completed' };

    try {
      await saveEvent(closedEvent);
      await closeEvent(closedEvent.id);
    } catch (e) {
      console.error('Supabase close failed:', e);
    }

    setEvents(prev => {
      const next = prev.map(e => e.id === closedEvent.id ? closedEvent : e);
      persistLocally(next);
      return next;
    });

    try {
      // Build all 4 workbooks as buffers
      const summaryBuf  = await buildEventWorkbook(closedEvent);
      const wlBuf       = await buildTaskWorkbook(closedEvent, FIRST_VISIT_PHASES.filter(p => p.id === 'warehouse_loading'), 'העמסת ציוד מחסן');
      const eaBuf       = await buildTaskWorkbook(closedEvent, FIRST_VISIT_PHASES.filter(p => p.id === 'event_arrival'),    'הגעה לאירוע');
      const etBuf       = await buildTaskWorkbook(closedEvent, SECOND_VISIT_PHASES,                                          'פירוק אירוע');

      // Download summary locally (always)
      await exportEventToExcel(closedEvent);

      // Upload all 4 to Drive if configured
      if (driveConfigured) {
        try {
          const folderUrl = await uploadEventToDrive(closedEvent.eventName, closedEvent.eventDate, [
            { name: `סיכום_אירוע_${closedEvent.eventName}.xlsx`,   buffer: summaryBuf },
            { name: `העמסת_מחסן_${closedEvent.eventName}.xlsx`,    buffer: wlBuf },
            { name: `הגעה_לאירוע_${closedEvent.eventName}.xlsx`,   buffer: eaBuf },
            { name: `פירוק_אירוע_${closedEvent.eventName}.xlsx`,   buffer: etBuf },
          ]);
          alert(`✅ האירוע נסגר! הקבצים הועלו ל-Drive:\n${folderUrl}`);
        } catch (driveErr: any) {
          console.error('Drive upload failed:', driveErr);
          alert(`האירוע נסגר ✅\nהדוח הורד מקומית.\nשגיאת Drive: ${driveErr.message}`);
        }
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert('האירוע נסגר אך ייצוא ה-Excel נכשל.');
    }

    setIsSaving(false);
    alert('✅ האירוע נסגר בהצלחה! הדוח הורד לתיקיית ההורדות.');
    setCurrentDraft(null);
    setView('dashboard');
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id);
    } catch (e) {
      console.error('Supabase delete failed:', e);
    }
    setEvents(prev => {
      const next = prev.filter(e => e.id !== id);
      persistLocally(next);
      return next;
    });
  };

  // ── Re-export existing completed event ─────────────────────────────────
  const handleExportEvent = async (id: string) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    try {
      await exportEventToExcel(ev);
    } catch (e) {
      alert('ייצוא Excel נכשל.');
      console.error(e);
    }
  };

  // ── Login screen ───────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans"
        dir="rtl"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-12">
            <h1 className="text-yellow-500 text-7xl font-black tracking-tighter mb-2 italic">BNP</h1>
            <div className="h-1 w-24 bg-yellow-500 mx-auto rounded-full mb-4" />
            <p className="text-gray-400 uppercase tracking-[0.3em] text-xs font-light">
              Cocktail Bar Service
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-2xl">
            <h2 className="text-white text-lg mb-8 font-light">הכנס קוד גישה למערכת</h2>
            <input
              type="password"
              inputMode="numeric"
              placeholder="••••"
              className="bg-black/50 text-yellow-500 border border-gray-700 p-5 rounded-2xl text-center text-4xl mb-8 w-full focus:border-yellow-500 outline-none tracking-[0.5em] font-mono"
              autoFocus
              onChange={e => e.target.value === '2026' && setIsAuthenticated(true)}
            />
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span>ניהול מלאי — צוות מורשה בלבד</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── App ────────────────────────────────────────────────────────────────
  return (
    <Layout onNavigateHome={() => setView('dashboard')}>
      {view === 'dashboard' && (
        <Dashboard
          events={events}
          onCreateNew={handleCreateNew}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onImportEvent={handleImportEvent}
          onExportEvent={handleExportEvent}
        />
      )}
      {view === 'editor' && currentDraft && (
        <EventForm
          event={currentDraft}
          isSaving={isSaving}
          onSaveDraft={handleSaveDraft}
          onMarkReady={handleMarkReady}
          onClose={handleCloseEvent}
          onBack={() => { setCurrentDraft(null); setView('dashboard'); }}
        />
      )}
    </Layout>
  );
};

export default App;
