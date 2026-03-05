import React from 'react';
import { ClipboardList } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigateHome: () => void;
}

const BrandFallback = () => (
  <div className="flex flex-col items-center justify-center select-none">
    <div className="flex flex-col items-center leading-none">
      <div className="text-3xl font-extrabold text-[#122645] tracking-tight whitespace-nowrap">
        B&P COCKTAIL BAR
      </div>
      <div className="text-[11px] font-bold text-[#e48060] tracking-[0.25em] mt-1.5 uppercase whitespace-nowrap">
        BEACH , BUT PRIVATE
      </div>
    </div>
  </div>
);

export const Layout: React.FC<LayoutProps> = ({ children, onNavigateHome }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-32 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity h-full py-2"
            onClick={onNavigateHome}
          >
            {/* Primary Logo Image */}
            <img 
              src="logo.png" 
              alt="B&P Cocktail Bar" 
              className="h-full w-auto object-contain max-w-[300px]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                document.getElementById('fallback-brand')?.classList.remove('hidden');
              }}
            />
            
            {/* Fallback Brand Visualization */}
            <div id="fallback-brand" className="hidden">
               <BrandFallback />
            </div>
          </div>
          
          <div className="flex flex-col items-end justify-center text-slate-500 pl-4 border-l border-slate-100 h-12">
             <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-700 text-lg">רשמ"צ</span>
                <ClipboardList size={22} className="text-[#122645]" />
             </div>
             <span className="text-xs text-slate-400">ניהול ציוד לאירועים</span>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-slate-400 text-sm flex flex-col items-center gap-1">
          <span className="font-bold text-[#122645]">B&P COCKTAIL BAR</span>
          <span>© {new Date().getFullYear()} כל הזכויות שמורות</span>
        </div>
      </footer>
    </div>
  );
};