import React, { useState, useMemo } from 'react';
import { CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import type { TaskPhase } from '../constants/taskTemplates';

interface TaskChecklistProps {
  phases: TaskPhase[];
  tasksDone: Record<string, boolean>;
  onChange: (tasksDone: Record<string, boolean>) => void;
  allDone: boolean;
}

export const TaskChecklist: React.FC<TaskChecklistProps> = ({ phases, tasksDone, onChange, allDone }) => {
  const [activePhase,    setActivePhase]    = useState(phases[0]?.id ?? '');
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    onChange({ ...tasksDone, [taskId]: !tasksDone[taskId] });
  };

  const markAllDone = () => {
    const allIds = phases.flatMap(p => p.stages.flatMap(s => s.tasks.map(t => t.id)));
    const next: Record<string, boolean> = {};
    allIds.forEach(id => (next[id] = true));
    onChange({ ...tasksDone, ...next });
  };

  const toggleStage = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      next.has(stageId) ? next.delete(stageId) : next.add(stageId);
      return next;
    });
  };

  // Per-phase progress
  const phaseProgress = useMemo(() =>
    Object.fromEntries(phases.map(phase => {
      const allIds = phase.stages.flatMap(s => s.tasks.map(t => t.id));
      const doneCount = allIds.filter(id => tasksDone[id]).length;
      return [phase.id, { done: doneCount, total: allIds.length }];
    })),
  [phases, tasksDone]);

  const currentPhase = phases.find(p => p.id === activePhase);

  return (
    <div className="space-y-4">

      {/* Mark all done banner */}
      {!allDone ? (
        <button
          onClick={markAllDone}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 hover:border-indigo-400 transition-all active:scale-95"
        >
          <CheckSquare size={18} />
          סמן כלל המשימות כבוצעו
        </button>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-700 font-bold text-sm">
          <CheckSquare size={18} className="fill-emerald-100" />
          ✅ כלל המשימות בוצעו — ניתן לשמור
        </div>
      )}

      {/* Phase Tabs */}
      <div className="flex gap-2 flex-wrap">
        {phases.map(phase => {
          const { done, total } = phaseProgress[phase.id];
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
          const isActive = activePhase === phase.id;
          const isDone   = done === total && total > 0;

          return (
            <button
              key={phase.id}
              onClick={() => setActivePhase(phase.id)}
              className={`flex-1 min-w-[140px] flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md'
                  : isDone
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{phase.emoji}</span>
              <span className="leading-tight text-center">{phase.label}</span>
              {/* Mini progress bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-normal ${isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isDone ? '✅ הושלם' : `${done}/${total}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stages */}
      {currentPhase && (
        <div className="space-y-3">
          {currentPhase.stages.map(stage => {
            const stageDone  = stage.tasks.filter(t => tasksDone[t.id]).length;
            const stageTotal = stage.tasks.length;
            const allDone    = stageDone === stageTotal;
            const collapsed  = collapsedStages.has(stage.id);

            return (
              <div
                key={stage.id}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  allDone ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                {/* Stage Header */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-right transition-colors ${
                    allDone ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-emerald-200 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {stageDone}/{stageTotal}
                    </span>
                    {/* Stage progress pip */}
                    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                        style={{ width: `${stageTotal > 0 ? (stageDone / stageTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${allDone ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {allDone && '✅ '}{stage.name}
                    </span>
                    {collapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Tasks */}
                {!collapsed && (
                  <div className="divide-y divide-slate-100">
                    {stage.tasks.map(task => {
                      const done = !!tasksDone[task.id];
                      return (
                        <button
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors group ${
                            done
                              ? 'bg-emerald-50/60 hover:bg-emerald-50'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox icon */}
                          <div className={`flex-shrink-0 transition-colors ${done ? 'text-emerald-500' : 'text-slate-300 group-hover:text-slate-400'}`}>
                            {done
                              ? <CheckSquare size={22} className="fill-emerald-100" />
                              : <Square size={22} />
                            }
                          </div>

                          {/* Task text */}
                          <div className="flex-grow text-right">
                            <span className={`text-sm font-medium leading-snug ${
                              done ? 'line-through text-slate-400' : 'text-slate-700'
                            }`}>
                              {task.task}
                            </span>
                            {task.responsible && (
                              <span className="block text-xs text-slate-400 mt-0.5">
                                👤 {task.responsible}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
