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
  <div className={cn("bg-white/50 backdrop-blur-sm border border-clay/20 rounded-3xl p-6 shadow-sm", className)}>
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
    primary: "bg-sage text-white hover:bg-sage/90 shadow-md",
    secondary: "bg-warm text-ink hover:bg-warm/80",
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

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await getGlobalFatalitySummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
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
          <p className="text-clay text-sm font-medium tracking-widest uppercase mt-1">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-12 h-12 rounded-full bg-warm flex items-center justify-center text-sage shadow-inner">
            <Globe size={24} />
          </div>
          <button 
            onClick={fetchSummary} 
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
              activeTab === tab ? "bg-white text-sage shadow-sm" : "text-clay hover:text-sage"
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
                  <p className="serif italic text-clay">Scanning global news agencies for the last 24 hours...</p>
                </div>
              ) : summary && (
                <>
                  <Card className="bg-sage/5 border-sage/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sage">
                        <AlertTriangle size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">24-Hour Global Impact</span>
                      </div>
                      <div className="flex items-center gap-1 text-sage font-bold text-xl">
                        <Skull size={20} />
                        {summary.totalEstimated}
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
                            <div className="pt-2 border-t border-clay/10 flex flex-wrap gap-2">
                              {cat.sources.map((src, sIdx) => (
                                <a 
                                  key={sIdx} 
                                  href={src.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-sage hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink size={8} />
                                  {src.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </Card>
                      </div>
                    ))}
                  </div>
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
                <p className="text-sm text-clay">Hold space for those affected by global events in the last 24 hours.</p>
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
                      initialTime === mins * 60 ? "bg-sage border-sage text-white" : "border-clay/30 text-clay hover:border-clay"
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
          Strictly monitoring global events from the last 24 hours
        </p>
      </footer>
    </div>
  );
}
