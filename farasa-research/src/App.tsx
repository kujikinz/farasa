/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Book, 
  ScrollText, 
  Scale, 
  Gavel, 
  BookOpen,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are a Specialized Islamic Jurisprudence and Hadith Sciences Research Assistant named FARASA.

STRICT OUTPUT FORMATTING:
1. START response IMMEDIATELY with "## Answer".
2. Use EXACTLY these four headings in this order:
   ## Answer
   ## Quranic Foundation
   ## Hadith Analysis
   ## Madhhab Comparison
3. TAB TITLES MUST BE SHORT (Maximum 3 words). 
4. Use only English.
5. Provide comprehensive evidence from Quran, Authentic Hadith, and the four main Sunni Madhhabs (Hanafi, Maliki, Shafi'i, Hanbali).
6. NO BULLET POINTS: Do not use bullet points unless strictly necessary for a list that cannot be formatted as a paragraph. Prefer the structured blocks described below.
7. BOLDING: **BOLD** all Titles, Names of scholars, Books, Hadith Grades (e.g., **Sahih**, **Hasan**), Chapter numbers, Verse numbers, and **important keywords or rulings** within the text to improve readability.
8. PROPHETIC HONORIFICS: Every time any Prophet (e.g., Muhammad, Ibrahim, Musa, etc.) is mentioned, you MUST follow their name with **(peace be upon him)**.
9. RESEARCH SOURCES: You MUST strictly compile information from reputable sources such as Quran.com, IslamQA.info, Sunnah.com, IslamWeb.net, and the International Islamic Fiqh Academy (IIFA). 
   - IF the Search Tool provides results, prioritize those.
   - IF the Search Tool returns no results or is unavailable, use your extensive internal knowledge of the specific rulings and texts from these sources to fulfill the request. NEVER return an empty response.
10. CLINICAL NEUTRALITY: This is a strictly educational and academic research tool. Information on all jurisprudential topics, including rulings on animals, dietary laws, and physical interactions, MUST be provided in a neutral, descriptive, and scholarly manner without bias or emotive language.

SECTION STRUCTURES:

## Answer
### Classical View
[Introductory paragraph summarizing the traditional consensus or variety of views]

**Title:** [Explanation text here...]

**Title:** [Explanation text here...]

### Contemporary View
[Introductory paragraph summarizing modern applications or fatwas]

**Title:** [Explanation text here...]

### [Conclusion, Solution, OR How to]
[Select exactly ONE of the titles above (e.g., '### Conclusion' OR '### Solution' OR '### How to') that best fits the nature of the research topic. Provide a balanced, objective summary under that chosen single title.]

## Quranic Foundation
[Brief introductory text explaining the theme of the verses]

**Name of Surah, Chapter:Verse:** 
*[The verse text here in italics...]*

**Tafsir by Name:**
[The tafsir text here...]

**Name of Surah, Chapter:Verse:** 
*[The verse text here in italics...]*

**Tafsir by Name:**
[The tafsir text here...]

## Hadith Analysis
[Brief introductory text explaining the relevance of the prophetic guidance]

**Title:** *[The Hadith text here in italics...]* **[Book, Verse Number - Grade]**

[Explanation of the Hadith's application MUST start on a new line here...]

**Title:** *[The Hadith text here in italics...]* **[Book, Verse Number - Grade]**

[Explanation of the Hadith's application MUST start on a new line here...]

## Madhhab Comparison
### Hanafi
[Introductory text for the Hanafi position]

**Title:** [Detailed explanation...]

**Title:** [Detailed explanation...]

### Maliki
[Introductory text for the Maliki position]

**Title:** [Detailed explanation...]

### Shafi'i
[Introductory text for the Shafi'i position]

**Title:** [Detailed explanation...]

### Hanbali
[Introductory text for the Hanbali position]

**Title:** [Detailed explanation...]

IMPORTANT: Ensure double line breaks between any title and the preceding content to maintain a clean, readable layout.

OBJECTIVITY: Maintain a professional, scholarly, and clear text format. Ensure a neutral tone throughout.

`;

const ALL_TOPICS = [
  "Doubt regarding breaking Wudu", 
  "Forgot which Rak'ah I am in", 
  "How to pray on a plane",
  "Accidentally eating while fasting",
  "How to perform Tahajjud prayer",
  "Protection from the Evil Eye",
  "Forgetting if I have prayed or not",
  "Passing wind during Jumu'ah prayer",
  "Morning and Evening Adhkar",
  "Alcohol in perfumes and its ruling",
  "What nullifies my Wudu?",
  "What validates a Nikah (marriage)?",
  "How to avoid Riba in modern finance",
  "Pay my debt or perform Umrah first?",
  "Am I eligible to pay Zakat?"
];

interface Section {
  title: string;
  content: string;
}

export default function App() {
  const [view, setView] = useState<'home' | 'loading' | 'result' | 'credits'>('home');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [randomTopics] = useState(() => 
    [...ALL_TOPICS].sort(() => 0.5 - Math.random()).slice(0, 3)
  );
  const [scrollPosition, setScrollPosition] = useState({ top: true, bottom: false });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const internalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollDown = () => {
    if (internalScrollRef.current) {
      internalScrollRef.current.scrollBy({ top: 150, behavior: 'smooth' });
    }
  };

  const scrollUp = () => {
    if (internalScrollRef.current) {
      internalScrollRef.current.scrollBy({ top: -150, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (internalScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = internalScrollRef.current;
      setScrollPosition({
        top: scrollTop <= 5,
        bottom: scrollTop + clientHeight >= scrollHeight - 5 || scrollHeight <= clientHeight
      });
    }
  };

  useEffect(() => {
    const scrollEl = internalScrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      // Also check on tab change or content updates
      const observer = new ResizeObserver(handleScroll);
      observer.observe(scrollEl);
      
      return () => {
        scrollEl.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      };
    }
  }, [view, activeTab, sections]);

  const getTabIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("quran")) return <Book className="w-5 h-5" />;
    if (t.includes("hadith")) return <ScrollText className="w-5 h-5" />;
    if (t.includes("madhhab")) return <Scale className="w-5 h-5" />;
    if (t.includes("answer") || t.includes("conclusion")) return <Gavel className="w-5 h-5" />;
    return <BookOpen className="w-5 h-5" />;
  };

  const getShortTitle = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("quran")) return "Quran";
    if (t.includes("hadith")) return "Hadith";
    if (t.includes("madhab") || t.includes("madhhab")) return "Madhhab";
    if (t.includes("answer")) return "Answer";
    return title;
  };

  const parseToTabs = (rawText: string) => {
    // 1. Clean up the text: remove code block wrappers if model used them
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '');
    }

    // 2. Buckets for the 4 core pillars
    const buckets: Record<string, string[]> = {
      "Answer": [],
      "Quran": [],
      "Hadith": [],
      "Madhhab": []
    };

    // 3. Split by ## headers
    const rawSections = cleanText.split(/^##\s+/m).filter(s => s.trim().length > 0);
    
    if (rawSections.length === 0 || (rawSections.length === 1 && !cleanText.includes("## "))) {
      // No headers found, treat entire text as Answer/Summary
      buckets["Answer"].push(cleanText);
    } else {
      rawSections.forEach(section => {
        const firstLineEnd = section.indexOf('\n');
        const title = firstLineEnd !== -1 ? section.substring(0, firstLineEnd).trim() : section.trim();
        const content = firstLineEnd !== -1 ? section.substring(firstLineEnd).trim() : "";
        
        if (!title) return;

        const t = title.toLowerCase();
        if (t.includes("quran")) buckets["Quran"].push(content || title);
        else if (t.includes("hadith")) buckets["Hadith"].push(content || title);
        else if (t.includes("madhab") || t.includes("madhhab")) buckets["Madhhab"].push(content || title);
        else if (t.includes("conclusion") || t.includes("answer") || t.includes("solution") || t.includes("summary")) buckets["Answer"].push(content || title);
        else {
          // Fallback for unknown headers
          buckets["Answer"].push(`### ${title}\n\n${content}`);
        }
      });
    }

    // 4. Assemble the final sections in order
    const finalSections: Section[] = [];
    const labelMapping: Record<string, string> = {
      "Answer": "Answer",
      "Quran": "Quranic Foundation",
      "Hadith": "Hadith Analysis",
      "Madhhab": "Madhhab Comparison"
    };

    ["Answer", "Quran", "Hadith", "Madhhab"].forEach(label => {
      if (buckets[label].length > 0) {
        finalSections.push({
          title: labelMapping[label],
          content: buckets[label].join("\n\n")
        });
      }
    });

    // If we still have nothing but have cleanText, use it as Answer
    if (finalSections.length === 0 && cleanText.length > 0) {
      finalSections.push({
        title: "Answer",
        content: cleanText
      });
    }

    if (finalSections.length > 0) {
      setSections(finalSections);
      setActiveTab(0);
      return true;
    }

    return false;
  };

  const handleSearch = async (searchQuery?: string) => {
    const targetQuery = searchQuery || query;
    if (!targetQuery.trim()) return;

    setQuery(targetQuery);
    setView('loading');
    setError(null);

    try {
      let response: any;
      let usedSearch = false;
      
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: targetQuery,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ googleSearch: {} }] as any,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ]
          }
        });
        usedSearch = true;
        
        // Check for empty text response from search tool
        if (!response?.text || response.text.trim().length === 0) {
          console.warn("Search tool returned empty content, attempting fallback...");
          throw new Error("EMPTY_SEARCH_RESPONSE");
        }
      } catch (innerErr: any) {
        const innerMsg = innerErr?.message || String(innerErr);
        console.error("Primary search failed or empty:", innerMsg);
        
        // Fallback for permission errors OR empty responses
        if (
          innerMsg.includes("403") || 
          innerMsg.includes("PERMISSION_DENIED") || 
          innerMsg.includes("EMPTY_SEARCH_RESPONSE") ||
          innerMsg.includes("404")
        ) {
          console.log("Using base model fallback (no tools)...");
          response = await ai.models.generateContent({
            model: "gemini-1.5-flash", // Use a very stable model for fallback
            contents: targetQuery,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              ]
            }
          });
          usedSearch = false;
        } else {
          throw innerErr;
        }
      }
      
      const rawText = response?.text || "";

      if (rawText.trim() && parseToTabs(rawText)) {
        setView('result');
      } else {
        // Fallback: If parsing failed but we have text, show it in a single tab
        if (rawText.trim().length > 0) {
          setSections([{ 
            title: "Research Summary", 
            content: rawText.trim() 
          }]);
          setActiveTab(0);
          setView('result');
        } else {
          // Check for safety reason if text is still empty
          const candidate = response?.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const safetyRatings = candidate?.safetyRatings;
          
          console.error("Empty response debugging:", { finishReason, safetyRatings });

          if (finishReason === 'SAFETY') {
            throw new Error("This topic is restricted by safety filters. Please try rephrasing your search using academic or scholarship terms.");
          }
          
          throw new Error("The research query returned an empty response. Please try a more specific question.");
        }
      }
    } catch (err: any) {
      console.error("Final search error:", err);
      const errMsg = err?.message || String(err);
      
      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
        setError("The search service is currently restricted in this environment. Please ensure your API key has the necessary permissions.");
      } else if (errMsg.includes("SAFETY") || errMsg.includes("blocked") || errMsg.includes("candidate")) {
        setError("This research topic is restricted by safety filters. Try using more specific academic phrasing (e.g., 'What is the scholarly view on...')");
      } else if (errMsg.includes("empty response") || errMsg.includes("EMPTY_SEARCH_RESPONSE")) {
        setError("No content was generated for this topic. Try a broader search or different phrasing.");
      } else {
        setError(`Search failed. Please try again in a moment.`);
      }
      setView('home');
    }
  };

  const resetSearch = () => {
    setQuery('');
    setSections([]);
    setView('home');
    setError(null);
  };

  const handleInfo = () => {
    setView('credits');
  };

  const scrollTabs = (dir: 'left' | 'right') => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-white flex flex-col items-center selection:bg-grad-start/30">
      <div className="w-full max-w-7xl h-screen flex flex-col relative overflow-hidden bg-app-bg">
        
        {/* Header - Professional Style */}
        <header className="flex-none h-[72px] px-8 sm:px-20 flex items-center border-b border-app-border z-40 bg-app-bg relative">
          {/* Logo with dynamic alignment */}
            <motion.div 
            layout
            initial={false}
            animate={{ 
              left: view === 'home' ? '50%' : (windowWidth < 640 ? '32px' : '80px'),
              x: view === 'home' ? '-50%' : '0%'
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-1/2 -translate-y-1/2 text-xl font-logo font-black tracking-widest text-gradient select-none cursor-pointer z-20"
            onClick={resetSearch}
          >
            FARASA
          </motion.div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex-none flex items-center justify-end gap-2 sm:gap-4 z-10">
            {view !== 'home' && view !== 'credits' && (
              <button 
                onClick={resetSearch}
                className="p-2 text-white/50 hover:text-white transition-colors"
                title="New search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            
            {(view === 'result' || view === 'home') && (
              <button 
                onClick={handleInfo}
                className="p-2 text-white/50 hover:text-white transition-colors relative flex items-center justify-center rounded-full hover:bg-white/5"
                title="Credits & Sources"
              >
                <Info className="w-5 h-5" />
              </button>
            )}

            {view === 'credits' && (
              <button 
                onClick={() => setView(sections.length > 0 ? 'result' : 'home')}
                className="p-2 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Layout Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Content Viewport */}
          <main className="flex-1 relative flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {view === 'home' && (
                <motion.div 
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col items-center justify-center px-8 sm:px-20 overflow-y-auto scrollbar-hide"
                >
                  <div className="max-w-lg w-full flex flex-col items-center -mt-8 sm:-mt-12">
                    <motion.h1 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center mb-1 text-center leading-none tracking-tight"
                    >
                      <span className="text-lg sm:text-xl font-medium tracking-[0.2em] text-text-muted mb-1">
                        answers through
                      </span>
                      <span className="text-4xl sm:text-5xl font-bold">
                        Quran & Sunnah
                      </span>
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-text-muted text-base mb-8 leading-relaxed text-center max-w-sm"
                    >
                      your daily guide for spiritual wisdom
                    </motion.p>

                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                      className="bg-app-card rounded-[2rem] p-1.5 flex items-center shadow-2xl w-full border border-app-border focus-within:border-grad-start/30 transition-all overflow-hidden"
                    >
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="type a question or topic"
                        className="flex-1 bg-transparent border-none text-white px-4 sm:px-6 py-3 sm:py-4 outline-none text-sm sm:text-base placeholder:text-white/20 min-w-0"
                      />
                      <button 
                        type="submit" 
                        className="bg-brand-gradient hover:opacity-90 active:scale-95 text-white sm:px-8 p-3 sm:py-4 rounded-full sm:rounded-[1.5rem] font-bold text-sm transition-all shadow-lg flex-none flex items-center justify-center min-w-[44px] h-[44px] sm:h-auto"
                      >
                        <span className="hidden sm:inline">Search</span>
                        <Search className="sm:hidden w-5 h-5" />
                      </button>
                    </form>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs w-full text-center"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="mt-8 w-full text-center">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold block mb-4">Quick Questions / Topics</span>
                      <div className="flex flex-wrap justify-center gap-3">
                        {randomTopics.map((topic, idx) => (
                          <button 
                            key={`topic-${idx}-${topic}`} 
                            onClick={() => handleSearch(topic)}
                            className="bg-app-card hover:bg-white/5 border border-app-border text-text-muted hover:text-white px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'loading' && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-white/5 flex items-center justify-center mb-10">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 border-t-2 border-grad-start rounded-full shadow-[0_0_20px_rgba(233,59,129,0.3)]"
                    />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mb-2">Bismillah</h2>
                  <p className="text-text-muted text-sm max-w-[280px] text-center leading-relaxed">
                    Accessing foundational texts and cross-referencing diverse scholarly opinions...
                  </p>
                </motion.div>
              )}

              {view === 'result' && sections.length > 0 && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col overflow-hidden px-8 sm:px-20 pb-8 sm:pb-12 pt-0"
                >
                  {/* Topic View Header */}
                  <div className="flex-none pt-6 pb-4">
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 line-clamp-2 break-words"
                    >
                      {query}
                    </motion.h1>
                    
                    <div className="relative flex items-center w-full max-w-2xl px-1">
                      <button 
                        onClick={() => scrollTabs('left')}
                        className="flex-none sm:hidden p-2 mr-1 text-text-muted hover:text-white transition-colors bg-white/5 rounded-full border border-white/5 shadow-sm active:scale-90"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div 
                        ref={tabsRef} 
                        className="flex-1 flex overflow-x-auto gap-2 scrollbar-hide py-2 px-1 scroll-smooth"
                      >
                        {sections.map((sec, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              setActiveTab(idx);
                              if (internalScrollRef.current) internalScrollRef.current.scrollTo(0, 0);
                              (e.currentTarget as HTMLElement).scrollIntoView({
                                behavior: 'smooth',
                                block: 'nearest',
                                inline: 'center'
                              });
                            }}
                            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                              activeTab === idx 
                              ? 'bg-brand-gradient text-white shadow-lg' 
                              : 'bg-white/5 text-text-muted hover:text-white border border-white/5'
                            }`}
                          >
                            {getShortTitle(sec.title)}
                          </button>
                        ))}
                      </div>

                      <button 
                        onClick={() => scrollTabs('right')}
                        className="flex-none sm:hidden p-2 ml-1 text-text-muted hover:text-white transition-colors bg-white/5 rounded-full border border-white/5 shadow-sm active:scale-90"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Research Content Card */}
                  <div className="flex-1 overflow-hidden">
                    <motion.div 
                      layoutId="research-container"
                      className="research-card h-full flex flex-col relative overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex-1 flex flex-col overflow-hidden"
                        >
                          {/* Heading with ◈ from Design */}
                          <div className="flex-none text-lg font-bold text-gradient mb-5 flex items-center gap-3">
                            <span className="text-xl">◈</span> {sections[activeTab].title}
                          </div>
                          
                          <div 
                            ref={internalScrollRef}
                            className="flex-1 overflow-y-auto pr-4 scrollbar-hide markdown-content"
                          >
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({node, ...props}) => (
                                  <div className="table-wrapper">
                                    <table {...props} />
                                  </div>
                                )
                              }}
                            >
                              {sections[activeTab].content}
                            </ReactMarkdown>
                          </div>

                          {/* Scroll Indicators Cluster */}
                          <div className="absolute bottom-6 right-2 flex flex-col gap-2 z-30">
                            <AnimatePresence>
                              {!scrollPosition.top && (
                                <motion.button 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollUp();
                                  }}
                                  className="p-1.5 bg-app-card-bg/95 backdrop-blur-md rounded-lg border border-app-border shadow-xl hover:bg-grad-start/10 transition-colors group"
                                  title="Scroll Up"
                                >
                                  <ChevronUp className="w-4 h-4 text-grad-start group-hover:scale-110 transition-transform" />
                                </motion.button>
                              )}
                              {!scrollPosition.bottom && (
                                <motion.button 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollDown();
                                  }}
                                  className="p-1.5 bg-app-card-bg/95 backdrop-blur-md rounded-lg border border-app-border shadow-xl hover:bg-grad-end/10 transition-colors group"
                                  title="Scroll Down"
                                >
                                  <ChevronDown className="w-4 h-4 text-grad-end group-hover:scale-110 transition-transform" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {view === 'credits' && (
                <motion.div 
                  key="credits"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 flex flex-col overflow-y-auto px-8 sm:px-20 py-10 scrollbar-hide"
                >
                  <div className="max-w-3xl mx-auto w-full">
                    <header className="mb-12">
                      <h2 className="text-3xl font-bold mb-6">Credits & Sources</h2>
                      <p className="text-text-muted leading-relaxed">
                        Farasa is an educational research assistant designed to provide clear, evidence-based insights into Islamic jurisprudence and sciences. <span className="text-white font-medium">We do not formulate original opinions or independent rulings</span>; rather, we strictly aggregate and synthesize information from reputable scholarly sources to facilitate your own research and understanding.
                      </p>
                    </header>

                    <section className="mb-12">
                      <h3 className="text-xl font-bold mb-4">Primary Data Sources</h3>
                      <p className="text-text-muted mb-6">To ensure the highest level of accuracy, this app strictly aggregates and synthesizes information from the following reputable platforms:</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                          <p className="text-sm leading-relaxed">
                            <strong className="text-white block mb-1">Quranic Text</strong> 
                            Exegesis and translations provided by <span className="text-grad-end">Quran.com</span>.
                          </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                          <p className="text-sm leading-relaxed">
                            <strong className="text-white block mb-1">Hadith Analysis</strong> 
                            Powered by <span className="text-grad-end">Sunnah.com</span>, utilizing their database of the Kutub al-Sittah and scholarly gradings.
                          </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                          <p className="text-sm leading-relaxed">
                            <strong className="text-white block mb-1">Jurisprudential Research</strong> 
                            Comparative Fiqh insights are drawn from <span className="text-grad-end">IslamWeb.net</span> and <span className="text-grad-end">IslamQA.info</span>.
                          </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                          <p className="text-sm leading-relaxed">
                            <strong className="text-white block mb-1">Contemporary Fatwas</strong> 
                            Modern resolutions are sourced from the <span className="text-grad-start">International Islamic Fiqh Academy (IIFA)</span>.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="border-t border-white/10 pt-10 mb-20">
                      <h3 className="text-xl font-bold mb-6">Legal & Ethical Disclaimer</h3>
                      <div className="space-y-6 text-sm text-text-muted leading-relaxed">
                        <p>
                          <strong className="text-white block mb-1">Non-Commercial Intent:</strong>
                          Farasa is a free, non-profit educational tool. It does not claim ownership of the primary religious texts or translations displayed.
                        </p>
                        <p>
                          <strong className="text-white block mb-1">Aggregation:</strong>
                          This app functions as a specialized research "shell" that compiles publicly available data for ease of study.
                        </p>
                        <p>
                          <strong className="text-white block mb-1">Not a Fatwa Center:</strong>
                          The information provided is for educational purposes only. Users are strongly encouraged to consult with qualified local scholars for final legal rulings (Fatwas) regarding their specific circumstances.
                        </p>
                        <p>
                          <strong className="text-white block mb-1">Intellectual Property:</strong>
                          We respect the copyright and terms of service of all original content providers. If you are a representative of a source listed above and wish to discuss our implementation, please contact us directly.
                        </p>
                      </div>
                    </section>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        <footer className="flex-none px-8 sm:px-10 py-6 text-center border-t border-app-border">
          <p className="text-[10px] text-text-muted/50 tracking-[0.1em] font-medium max-w-4xl mx-auto leading-loose uppercase">
            <span className="font-bold text-text-muted/80">Farasa</span> does not mediate between opinions. We provide information needed for your own research via reliable Islamic sources listed on our info page.
          </p>
        </footer>

        {/* Decorative Background for Home */}
        {view === 'home' && (
          <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-grad-start/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-grad-end/5 rounded-full blur-[100px]" />
          </div>
        )}
      </div>
    </div>
  );
}
