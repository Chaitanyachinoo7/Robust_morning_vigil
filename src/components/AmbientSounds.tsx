import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  VolumeX, 
  CloudRain, 
  TreePine, 
  Music, 
  ChevronDown,
  Volume1
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AMBIENT_SOUNDS = [
  { 
    id: 'rain', 
    name: 'Gentle Rain', 
    url: 'https://raw.githubusercontent.com/fedeperovano/ambient-sounds/master/public/sounds/rain.mp3', 
    icon: CloudRain 
  },
  { 
    id: 'nature', 
    name: 'Forest', 
    url: 'https://raw.githubusercontent.com/fedeperovano/ambient-sounds/master/public/sounds/forest.mp3', 
    icon: TreePine 
  },
  { 
    id: 'music', 
    name: 'Calm Piano', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder music
    icon: Music 
  },
];

export function AmbientSounds() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(AMBIENT_SOUNDS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(currentSound.url);
      audioRef.current.loop = true;
    } else {
      audioRef.current.src = currentSound.url;
    }
    
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [currentSound]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 bg-clay/5 backdrop-blur-md border border-clay/10 rounded-full p-1 pl-3 shadow-inner">
        <button 
          onClick={togglePlay}
          className={cn(
            "p-1.5 rounded-full transition-all",
            isPlaying ? "text-sage" : "text-clay/50"
          )}
          title={isPlaying ? "Mute" : "Play Ambient Sound"}
        >
          {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 py-1 hover:bg-clay/5 rounded-full transition-colors text-[10px] font-bold text-clay uppercase tracking-widest"
        >
          <currentSound.icon size={12} className={cn(isPlaying && "animate-pulse")} />
          <span className="hidden sm:inline">{currentSound.name}</span>
          <ChevronDown size={10} className={cn("transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-48 bg-paper border border-clay/10 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-3 border-bottom border-clay/5 bg-clay/5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Volume1 size={10} className="text-clay/50" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-clay/20 rounded-lg appearance-none cursor-pointer accent-sage"
                />
                <Volume2 size={10} className="text-sage" />
              </div>
            </div>

            <div className="p-1">
              {AMBIENT_SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setCurrentSound(sound);
                    setIsOpen(false);
                    if (!isPlaying) setIsPlaying(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    currentSound.id === sound.id 
                      ? "bg-sage text-paper shadow-sm" 
                      : "text-clay hover:bg-clay/5"
                  )}
                >
                  <sound.icon size={12} />
                  {sound.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
