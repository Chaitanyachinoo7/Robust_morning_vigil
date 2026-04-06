import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Wind, 
  Heart, 
  PenLine, 
  Sparkles, 
  ChevronRight, 
  Plus, 
  Trash2,
  AlertTriangle,
  Globe,
  ExternalLink,
  RefreshCw,
  Skull
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getGlobalFatalitySummary, type GlobalVigilSummary } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("bg-warm/5 backdrop-blur-sm border border-clay/10 rounded-3xl p-6 shadow-sm", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-sage text-paper hover:bg-sage/90 shadow-md",
    secondary: "bg-warm text-ink hover:bg-warm/80 border border-clay/20",
    ghost: "bg-transparent hover:bg-clay/10 text-sage"
  };
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-2.5 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [summary, setSummary] = useState<GlobalVigilSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTime, setRetryTime] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'timer' | 'journal'>('summary');
  
  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [initialTime, setInitialTime] = useState(600);

  // Journal State
  const [entries, setEntries] = useState<{ id: string; text: string; date: string }[]>(() => {
    const saved = localStorage.getItem('vigil_journal');
    return saved ? JSON.parse(saved) : [];
  });
  const [newEntry, setNewEntry] = useState('');

  const fetchSummary = async (force = false) => {
    setLoading(true);
    setError(null);
    setRetryTime(null);
    try {
      const data = await getGlobalFatalitySummary(force);
      setSummary(data);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'QUOTA_EXCEEDED') {
        setError('QUOTA_EXCEEDED');
        setRetryTime(err.retryTime);
      } else {
        setError('FAILED_TO_LOAD');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    localStorage.setItem('vigil_journal', JSON.stringify(entries));
  }, [entries]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatUTC = (date: Date | string, formatStr: string = 'HH:mm') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (formatStr === 'HH:mm') {
      return d.toISOString().split('T')[1].slice(0, 5);
    }
    if (formatStr === 'MMM d, HH:mm') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.toISOString().split('T')[1].slice(0, 5)}`;
    }
    return d.toUTCString();
  };

  const addEntry = () => {
    if (!newEntry.trim()) return;
    const entry = {
      id: crypto.randomUUID(),
      text: newEntry,
      date: new Date().toISOString()
    };
    setEntries([entry, ...entries]);
    setNewEntry('');
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">
      {/* Header */}
      <header className="flex justify-between items-start mb-4">
        <div>
          <h1 className="serif text-4xl font-medium text-sage italic">Global Morning Vigil</h1>
          <div className="flex flex-col mt-2">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-sage/10 text-sage text-[9px] font-bold rounded uppercase tracking-wider">Current Time</span>
              <p className="text-clay text-sm font-bold tracking-widest uppercase">
                {formatUTC(new Date(), 'MMM d, HH:mm')} GMT/UTC
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-1.5 py-0.5 bg-clay/10 text-clay text-[9px] font-bold rounded uppercase tracking-wider">24H Window</span>
              <p className="text-[10px] text-clay/70 font-medium tracking-widest uppercase">
                {formatUTC(new Date(new Date().getTime() - 24 * 60 * 60 * 1000), 'MMM d, HH:mm')} - {formatUTC(new Date(), 'MMM d, HH:mm')} GMT/UTC
              </p>
            </div>
            <p className="text-[9px] text-clay/40 font-bold tracking-widest uppercase mt-2 border-l-2 border-sage/20 pl-2">
              Sudden & Tragic Fatalities Only • No Natural Deaths
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
              <div className="w-12 h-12 rounded-full bg-warm/50 border border-sage/20 flex items-center justify-center text-sage shadow-inner">
            <Globe size={24} />
          </div>
          <button 
            onClick={() => fetchSummary(true)} 
            disabled={loading}
            className="text-[10px] text-clay hover:text-sage flex items-center gap-1 uppercase tracking-widest font-bold transition-colors"
          >
            <RefreshCw size={10} className={cn(loading && "animate-spin")} />
            Refresh Data
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-2 p-1 bg-clay/10 rounded-full self-center">
        {(['summary', 'timer', 'journal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all capitalize",
              activeTab === tab ? "bg-sage text-paper shadow-sm" : "text-clay hover:text-sage"
            )}
          >
            {tab === 'summary' ? 'Global Summary' : tab}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <Globe className="text-clay" size={32} />
                  </motion.div>
                  <p className="serif italic text-clay">Scanning global and national news agencies, YouTube, KKTV 11, WGN News, and official news handles for sudden and tragic fatalities in the last 24 hours...</p>
                </div>
              ) : error ? (
                <Card className="bg-clay/5 border-clay/20 py-12 flex flex-col items-center gap-4 text-center">
                  <AlertTriangle className="text-clay" size={48} />
                  <div className="max-w-md">
                    <h3 className="serif text-xl italic text-sage mb-2">
                      {error === 'QUOTA_EXCEEDED' ? 'Global Vigil Quota Reached' : 'Connection Interrupted'}
                    </h3>
                    <p className="text-sm text-clay leading-relaxed">
                      {error === 'QUOTA_EXCEEDED' 
                        ? `Our global monitoring system has reached its daily limit for search grounding. ${retryTime ? `Please retry in ${retryTime}.` : 'Please try again in a few hours when the quota resets.'}` 
                        : 'We were unable to retrieve the latest global fatality data. Please check your connection and try again.'}
                    </p>
                  </div>
                  <Button onClick={() => fetchSummary(true)} variant="secondary" className="mt-4">
                    <RefreshCw size={16} />
                    Retry Connection
                  </Button>
                </Card>
              ) : summary && (
                <>
                  <Card className="bg-sage/5 border-sage/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sage">
                          <AlertTriangle size={18} />
                          <span className="text-xs font-bold uppercase tracking-widest">24-Hour Global Impact</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-sage font-bold text-xl">
                            <Skull size={20} />
                            {summary.totalEstimated}
                          </div>
                          <span className="text-[10px] text-clay uppercase tracking-widest font-medium">
                            Window: {formatUTC(new Date(new Date(summary.timestamp).getTime() - 24 * 60 * 60 * 1000), 'MMM d, HH:mm')} - {formatUTC(summary.timestamp, 'MMM d, HH:mm')} UTC
                            {summary.isFallback && (
                              <span className="ml-2 px-1.5 py-0.5 bg-violet-900/30 text-violet-300 border border-violet-500/30 rounded-sm text-[8px] font-bold tracking-widest uppercase">
                                Fallback Mode
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    <p className="text-ink/80 leading-relaxed italic border-l-2 border-sage/20 pl-4">
                      {summary.overallAnalysis}
                    </p>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {summary.categories.map((cat, idx) => (
                      <div key={idx}>
                        <Card className="flex flex-col h-full gap-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-clay">{cat.category}</span>
                            <span className="text-sage font-bold">{cat.count}</span>
                          </div>
                          <p className="text-sm text-ink/70 flex-1">{cat.summary}</p>
                          {cat.sources && cat.sources.length > 0 && (
                            <div className="pt-2 border-t border-clay/10">
                              <span className="text-[8px] uppercase tracking-widest text-clay/60 block mb-1">Reported by:</span>
                              <div className="flex flex-wrap gap-2">
                                {cat.sources.map((src, sIdx) => (
                                  <a 
                                    key={sIdx} 
                                    href={src.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-sage hover:underline flex items-center gap-1 bg-sage/5 px-1.5 py-0.5 rounded-sm"
                                  >
                                    <ExternalLink size={8} />
                                    {src.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      </div>
                    ))}
                  </div>

                  {summary.groundingSources && summary.groundingSources.length > 0 && (
                    <Card className="bg-paper border-clay/20">
                      <div className="flex items-center gap-2 text-clay mb-4">
                        <Globe size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Verified Search Grounding Sources</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                        {summary.groundingSources.map((src, idx) => (
                          <a 
                            key={idx} 
                            href={src.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] text-ink/60 hover:text-sage transition-colors flex items-start gap-2 group"
                          >
                            <div className="w-1 h-1 rounded-full bg-clay/40 mt-1.5 group-hover:bg-sage transition-colors" />
                            <span className="flex-1 line-clamp-1">{src.title}</span>
                            <ExternalLink size={10} className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ))}
                      </div>
                      <p className="mt-4 text-[9px] text-clay/60 italic">
                        * These sources were used by the AI to ground its analysis in real-time search results.
                      </p>
                    </Card>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'timer' && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-8 py-12"
            >
              <div className="text-center max-w-md mb-4">
                <h2 className="serif text-2xl italic text-sage mb-2">Moment of Vigil</h2>
                <p className="text-sm text-clay">Hold space for those affected by sudden and tragic global events in the last 24 hours.</p>
              </div>
              
              <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-clay/10"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={754}
                    animate={{ strokeDashoffset: 754 * (1 - timeLeft / initialTime) }}
                    className="text-sage"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="serif text-5xl font-light text-sage">{formatTime(timeLeft)}</span>
                  <span className="text-xs text-clay uppercase tracking-widest mt-2">Remaining</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => setTimerActive(!timerActive)}
                  variant={timerActive ? 'secondary' : 'primary'}
                >
                  {timerActive ? 'Pause' : 'Begin Vigil'}
                </Button>
                <Button 
                  onClick={() => {
                    setTimerActive(false);
                    setTimeLeft(600);
                  }}
                  variant="ghost"
                >
                  Reset
                </Button>
              </div>

              <div className="flex gap-2">
                {[5, 10, 20].map(mins => (
                  <button
                    key={mins}
                    onClick={() => {
                      const secs = mins * 60;
                      setTimeLeft(secs);
                      setInitialTime(secs);
                      setTimerActive(false);
                    }}
                    className={cn(
                      "px-4 py-1 rounded-full text-xs font-medium border transition-all",
                      initialTime === mins * 60 ? "bg-sage border-sage text-paper" : "border-clay/30 text-clay hover:border-clay"
                    )}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <Card className="p-4">
                <div className="flex gap-2">
                  <textarea
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    placeholder="Record your thoughts or prayers for the world..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none min-h-[100px] text-ink placeholder:text-clay/50"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button onClick={addEntry} className="px-4 py-1.5 text-sm">
                    <Plus size={16} /> Save Entry
                  </Button>
                </div>
              </Card>

              <div className="flex flex-col gap-4">
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative"
                  >
                    <Card className="hover:border-sage/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-clay uppercase tracking-widest">
                          {format(new Date(entry.date), 'MMM d, h:mm a')}
                        </span>
                        <button 
                          onClick={() => deleteEntry(entry.id)}
                          className="text-clay opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-ink/80 whitespace-pre-wrap">{entry.text}</p>
                    </Card>
                  </motion.div>
                ))}
                {entries.length === 0 && (
                  <div className="text-center py-12">
                    <PenLine className="mx-auto text-clay/20 mb-3" size={48} />
                    <p className="serif italic text-clay">Your journal is empty. Begin your vigil by writing.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer info */}
      <footer className="mt-12 pt-8 border-t border-clay/10 text-center">
        <p className="text-[10px] text-clay uppercase tracking-[0.2em] font-medium">
          Strictly monitoring sudden and tragic global fatalities from the last 24 hours
        </p>
        <p className="text-[9px] text-clay/50 uppercase tracking-[0.1em] mt-1">
          Excluding natural deaths and old-age passings
        </p>
      </footer>
    </div>
  );
}
