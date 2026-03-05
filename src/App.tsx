import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import type { EventRecord, EventType, EquipmentItem } from './types';
import { EVENT_TEMPLATES } from './constants';

const App: React.FC = () => {
  // --- מנגנון נעילה BNP (ללא משתנים מיותרים) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  // --- הגנה: מסך נעילה ---
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
              // רק בודקים אם הוקלד הקוד הנכון, בלי לשמור משתנים סתם
              if (e.target.value === '2026') {
                setIsAuthenticated(true);
              }
            }}
          />
          <p className="text-gray-500 text-xs">הגישה לצוות מורשה בלבד. המערכת מנטרת כניסות.</p>
        </div>
      </div>
    );
  }

  // --- פונקציות האפליקציה (המשך הקוד נשאר בדיוק אותו דבר מפה והלאה) ---
  const downloadConsumptionReport = async (event: EventRecord) => {
