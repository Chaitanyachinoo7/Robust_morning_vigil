import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

const KALMAS = [
  {
    title: "1- First Kalima (Tayyab)",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ",
    transliteration: "La ilaha illallahu Muhammadur Rasulullah",
    translation: "There is no God but Allah, [and] Muhammad is the messenger of Allah."
  },
  {
    title: "2- Second Kalima (Shahadat)",
    arabic: "أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    transliteration: "Ash-hadu al-laaa ilaaha illallaahu wah dahoo laa shareeka lahoo wa-ash-hadu anna Muhammadan 'abduhoo wa rasoolooh",
    translation: "I bear witness that there is no God but Allah, He is alone and has no partner and I bear witness that Muhammad is His servant and Messenger."
  },
  {
    title: "3- Third Kalima (Tamjeed)",
    arabic: "سُبْحَانَ اللهِ وَالْحَمْدُ لِلهِ وَلَا إِلٰهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ",
    transliteration: "Subhanallaahi wal hamdu lillaahi wa laa ilaaha illallaahu wallaahu akbar. Walaa hawla walaa quwwata illaa billaahil 'aliyyil 'azeem",
    translation: "Glory be to Allah and all praise be to Allah and there is no God but Allah and Allah is the Greatest. And there is no power and no strength except from Allah, the Most High, the Most Great."
  },
  {
    title: "4- Fourth Kalima (Touheed)",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ حَيٌّ لَا يَمُوتُ أَبَدًا أَبَدًا، ذُو الْجَلَالِ وَالْإِكْرَامِ، بِيَدِهِ الْخَيْرُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Laa ilaaha illallaahu wahdahoo laa shareeka lahoo lahul mulku wa lahul hamdu yuhyee wa yumeetu wa huwa hayyul-laa yamootu abadan abada. Zul jalali wal ikraam. Biyadihil khair. Wa huwa 'ala kulli shai-in qadeer",
    translation: "There is no God but Allah, He is alone and has no partner. To Him belongs the Kingdom and to Him belongs all praise. He gives life and causes death, and He is living and will never die. Forever and ever. Owner of Majesty and Honor. In His hand is all good and He has power over all things."
  },
  {
    title: "5- Fifth Kalima (Astaghfar)",
    arabic: "أَسْتَغْفِرُ اللهَ رَبِّي مِنْ كُلِّ ذَنْبٍ أَذْنَبْتُهُ عَمَدًا أَوْ خَطَأً سِرًّا أَوْ عَلَانِيَةً وَأَتُوبُ إِلَيْهِ مِنَ الذَّنْبِ الَّذِي أَعْلَمُ وَمِنَ الذَّنْبِ الَّذِي لَا أَعْلَمُ، إِنَّكَ أَنْتَ عَلَّامُ الْغُيُوبِ وَسَتَّارُ الْعُيُوبِ وَغَفَّارُ الذُّنُوبِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ",
    transliteration: "Astaghfirullaaha rabbee min kulli zambin aznabtuhoo 'amadan aw khata-an sirran aw 'alaaniyata-wa-atoobu ilaiyhi minaz zambillazee a'lamu wa minaz zambillazee laaa a'lamu innaka anta 'allaamul ghuyoobi wa sattaarul 'uyoobi wa ghaffaaruz zunoobi wa laa hawla walaa quwwata illaa billaahil 'aliyyil 'azeem",
    translation: "I seek forgiveness from Allah, my Lord, for every sin I committed knowingly or unknowingly, secretly or openly. I turn to Him from the sin that I know and from the sin that I do not know. Certainly You are the Knower of the hidden and the Concealer of faults and the Forgiver of sins. And there is no power and no strength except from Allah, the Most High, the Most Great."
  },
  {
    title: "6- Sixth Kalima (Radd-e-Kufar)",
    arabic: "اَللّٰهُمَّ إِنِّيْ أَعُوْذُ بِكَ مِنْ أَنْ أُشْرِكَ بِكَ شَيْئًا وَّاَنَا أَعْلَمُ بِهٖ وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ بِهٖ تُبْتُ عَنْهُ وَتَبَرَّأْتُ مِنَ الْكُفْرِ وَالشِّرْكِ وَالْكِذْبِ وَالْغِيْبَةِ وَالْبِدْعَةِ وَالنَّمِيْمَةِ وَالْفَوَاحِشِ وَالْبُهْتَانِ وَالْمَعَاصِيْ كُلِّهَا وَأَسْلَمْتُ وَأَقُوْلُ لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُوْلُ اللهِ",
    transliteration: "Allaahumma innee a'oozu bika min an ushrika bika shaian wa-ana a'lamu bihee wa-astaghfiruka limaa laa a'lamu bihee tubtu 'anhu wa tabarraatu minal kufri wash-shirki wal kizbi wal gheebati wal bid'ati wan nameemati wal fawaahishi wal buhtaani wal ma'aassee kullihaa wa aslamtu wa aqoolu laa ilaaha illallaahu Muhammadur Rasoolullaah",
    translation: "O Allah! I seek refuge in You from that I should ascribe any partner with You knowingly. I seek Your forgiveness for (those sins) which I do not know. I repent from them and I disassociate myself from disbelief, polytheism, falsehood, backbiting, innovation, slander, lewdness, calumny and all other sins. I submit and I say: There is no God but Allah, Muhammad is the Messenger of Allah."
  }
];

export const PrayerSection = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % KALMAS.length);
    }, 25000); // 25 seconds
    return () => clearInterval(interval);
  }, []);

  const current = KALMAS[index];

  return (
    <div className="w-full flex flex-col items-center py-8 px-4 border-y border-clay/10 bg-warm/5 my-8">
      <div className="flex items-center gap-2 text-sage mb-6">
        <Sparkles size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Global Prayer • Six Kalimas</span>
      </div>

      <div className="w-full max-w-2xl min-h-[220px] flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            <span className="text-[10px] font-bold text-clay uppercase tracking-[0.3em] mb-2">
              {current.title}
            </span>
            
            <p className="text-2xl md:text-3xl text-ink leading-loose font-arabic dir-rtl" dir="rtl">
              {current.arabic}
            </p>
            
            <p className="text-xs text-clay italic tracking-wide">
              {current.transliteration}
            </p>
            
            <p className="text-sm text-ink/80 leading-relaxed max-w-lg">
              {current.translation}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-2 mt-8">
        {KALMAS.map((_, i) => (
          <div 
            key={i}
            className={`h-1 rounded-full transition-all duration-1000 ${
              i === index ? 'w-8 bg-sage' : 'w-2 bg-clay/20'
            }`}
          />
        ))}
      </div>
      
      <p className="text-[9px] text-clay/40 font-bold tracking-[0.2em] uppercase mt-4">
        Cycles every 25 seconds
      </p>
    </div>
  );
};
