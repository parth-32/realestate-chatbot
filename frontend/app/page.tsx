'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Sparkles, 
  Search, 
  Calculator, 
  Settings2, 
  Globe, 
  Send, 
  ExternalLink, 
  Bed, 
  Maximize2, 
  MapPin, 
  ChevronRight, 
  CheckCircle2, 
  Key, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  Percent,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Property, ChatMessage, SystemStats, FilterState } from '../types/property';
import { MarkdownRenderer } from './MarkdownRenderer';


export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'catalog' | 'calculator'>('chat');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [stats, setStats] = useState<SystemStats | null>(null);
  
  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('minimax/minimax-m3:free');
  const [apiKey, setApiKey] = useState('');
  const [apiStatus, setApiStatus] = useState<'idle' | 'connected' | 'testing'>('idle');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: language === 'en' 
        ? "Greetings. I am **AURA**, your Private Concierge for **DarGlobal** international branded developments and **Wasalt** prime Saudi Arabian real estate.\n\nWhether you are acquiring a Pagani penthouse in Dubai, a Lamborghini villa in Spain, a clifftop Trump mansion in Oman, or a luxury family residence in Riyadh, I am at your service. How may I assist your investment portfolio today?"
        : "مرحباً بك. أنا **أورا (AURA)**، مستشارك العقاري الخاص لمشاريع **دار جلوبال (DarGlobal)** العالمية الفاخرة ومنصة **وصلت (Wasalt)** الرائدة في المملكة العربية السعودية.\n\nسواء كنت تتطلع لاقتناء بنتهاوس بتصميم باجاني في دبي، أو فيلا لامبورغيني في إسبانيا، أو قصر ترامب في عُمان، أو عقار سكني فاخر في الرياض؛ يسعدني خدمتك ومساعدتك في اختيار استثمارك الأمثل.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'DarGlobal × Wasalt AI'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Catalog State
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    source: '',
    city: '',
    property_type: '',
    min_price: 0,
    max_price: 50000000,
    min_beds: 0,
    search: ''
  });

  // Mortgage Calculator State
  const [calcPrice, setCalcPrice] = useState<number>(4500000);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(20);
  const [loanTermYears, setLoanTermYears] = useState<number>(25);
  const [interestRatePct, setInterestRatePct] = useState<number>(4.5);
  const [expectedYieldPct, setExpectedYieldPct] = useState<number>(7.2);

  // Load stats and settings on mount
  useEffect(() => {
    fetchStats();
    fetchProperties();
    const storedKey = localStorage.getItem('openrouter_key');
    if (storedKey) setApiKey(storedKey);
    const storedModel = localStorage.getItem('openrouter_model');
    const retiredModels = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'deepseek/deepseek-r1:free',
      'mistralai/mistral-small-3.1-24b-instruct:free'
    ];
    if (storedModel && !retiredModels.includes(storedModel)) {
      setSelectedModel(storedModel);
    } else {
      setSelectedModel('minimax/minimax-m3:free');
      localStorage.setItem('openrouter_model', 'minimax/minimax-m3:free');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  const fetchProperties = async (currentFilters: FilterState = filters) => {
    setIsLoadingProps(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.source) params.append('source', currentFilters.source);
      if (currentFilters.city) params.append('city', currentFilters.city);
      if (currentFilters.property_type) params.append('property_type', currentFilters.property_type);
      if (currentFilters.search) params.append('query', currentFilters.search);
      if (currentFilters.min_price > 0) params.append('min_price', currentFilters.min_price.toString());
      if (currentFilters.max_price < 50000000) params.append('max_price', currentFilters.max_price.toString());
      if (currentFilters.min_beds > 0) params.append('min_beds', currentFilters.min_beds.toString());
      params.append('page_size', '30');

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (e) {
      console.error('Failed to load properties', e);
    } finally {
      setIsLoadingProps(false);
    }
  };

  const testConnection = async () => {
    setApiStatus('testing');
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setApiStatus('connected');
        localStorage.setItem('openrouter_key', apiKey);
        localStorage.setItem('openrouter_model', selectedModel);
      } else {
        setApiStatus('idle');
      }
    } catch {
      setApiStatus('idle');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputQuery('');
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      properties: []
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          api_key: apiKey || undefined,
          stream: true
        })
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start chat stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let recommendedCards: Partial<Property>[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'meta' && parsed.properties) {
              recommendedCards = parsed.properties;
              setMessages((prev) => 
                prev.map(m => m.id === assistantMsgId ? { ...m, properties: recommendedCards } : m)
              );
            } else if (parsed.token) {
              accumulatedContent += parsed.token;
              setMessages((prev) => 
                prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m)
              );
            }
          } catch {
            // non-json line
          }
        }
      }
    } catch (err) {
      console.error('Chat stream error:', err);
      setMessages((prev) => 
        prev.map(m => m.id === assistantMsgId ? { 
          ...m, 
          content: "I apologize, but I encountered an issue connecting to the AI model. Please verify your connection or try another free model in Settings." 
        } : m)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const quickPrompts = [
    { label: "🏎️ Pagani & Lamborghini Residences", query: "Show me Pagani and Lamborghini branded villas and penthouses in Dubai and Spain." },
    { label: "🇸🇦 Riyadh Luxury Villas under 4M SAR", query: "Find me luxury family villas in Riyadh priced under 4,000,000 SAR on Wasalt." },
    { label: "🌊 Clifftop Trump Mansions in Oman", query: "Tell me about Trump Cliff Villas and Golf Residences in AIDA Oman." },
    { label: "📜 UAE 10-Year Golden Visa Options", query: "Which DarGlobal properties in Dubai qualify for the UAE 10-Year Golden Visa?" },
    { label: "🏙️ North Riyadh Turnkey Apartments", query: "What modern turnkey apartments are available in North Riyadh districts like Al-Narjis and Al-Yasmin?" }
  ];

  // Mortgage calculations
  const downPaymentAmount = (calcPrice * downPaymentPct) / 100;
  const loanAmount = calcPrice - downPaymentAmount;
  const monthlyInterestRate = (interestRatePct / 100) / 12;
  const totalMonths = loanTermYears * 12;
  const monthlyPayment = monthlyInterestRate > 0 
    ? (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths)) / (Math.pow(1 + monthlyInterestRate, totalMonths) - 1)
    : loanAmount / totalMonths;
  const totalPayment = monthlyPayment * totalMonths;
  const totalInterest = totalPayment - loanAmount;
  const annualRentalIncome = (calcPrice * expectedYieldPct) / 100;
  const monthlyRentalIncome = annualRentalIncome / 12;
  const netMonthlyCashFlow = monthlyRentalIncome - monthlyPayment;

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#070A11] flex flex-col font-sans">
      {/* Top Luxury Announcement Bar */}
      <div className="bg-gradient-to-r from-[#121929] via-[#1E293B] to-[#121929] border-b border-[#D4AF37]/20 py-1.5 px-4 text-xs flex justify-between items-center text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="font-medium text-[#D4AF37]">DarGlobal × Wasalt AI Concierge</span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span className="hidden md:inline text-slate-400">Public Listings Ingestion Live (48 Properties Indexed)</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Model:</span>
            <strong className="text-slate-200">{selectedModel.split('/')[1] || selectedModel}</strong>
          </span>
          <button 
            onClick={() => setLanguage(l => l === 'en' ? 'ar' : 'en')} 
            className="flex items-center gap-1 text-[#D4AF37] hover:text-white px-2 py-0.5 rounded border border-[#D4AF37]/30 text-xs transition"
          >
            <Globe className="w-3 h-3" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-[#D4AF37]/25 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8A6A12] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 border border-[#FFF]/20">
            <Building2 className="w-5 h-5 text-[#070A11]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display tracking-wider gold-gradient-text">AURA</h1>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold">
                Elite Concierge
              </span>
            </div>
            <p className="text-xs text-slate-400">International Branded Residences & Saudi Prime Portfolios</p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center bg-[#0C1220] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'chat' 
                ? 'bg-[#D4AF37] text-[#070A11] shadow-md shadow-[#D4AF37]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'AI Concierge' : 'المساعد الذكي'}</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'catalog' 
                ? 'bg-[#D4AF37] text-[#070A11] shadow-md shadow-[#D4AF37]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Property Explorer' : 'مستكشف العقارات'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/20 rounded-full">{stats?.total_properties || 48}</span>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'calculator' 
                ? 'bg-[#D4AF37] text-[#070A11] shadow-md shadow-[#D4AF37]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Mortgage & ROI' : 'حاسبة التمويل والعائد'}</span>
          </button>
        </div>

        {/* Right Action */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition"
          title="Settings & OpenRouter Models"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden">
        {/* TAB 1: AI CONCIERGE CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-[calc(100vh-145px)] glass-panel rounded-2xl overflow-hidden border border-[#D4AF37]/25 shadow-2xl">
            {/* Quick Prompts Bar */}
            <div className="bg-[#0A0F1D]/80 border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto flex items-center gap-2 scrollbar-none">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap mr-1">
                {language === 'en' ? 'Quick Prompts:' : 'استفسارات شائعة:'}
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="whitespace-nowrap text-xs bg-slate-900/90 hover:bg-[#D4AF37]/15 hover:border-[#D4AF37]/50 text-slate-300 hover:text-[#D4AF37] border border-slate-800 px-3 py-1.5 rounded-full transition shadow-sm"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {m.role === 'user' ? (language === 'en' ? 'You' : 'أنت') : 'AURA Luxury Concierge'}
                    </span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                    {m.model && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-[#D4AF37] border border-[#D4AF37]/20">
                        {m.model.includes('/') ? m.model.split('/')[1] : m.model}
                      </span>
                    )}
                  </div>

                  <div
                    className={`max-w-3xl rounded-2xl p-4 md:p-5 shadow-lg text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#070A11] font-medium rounded-tr-none'
                        : 'bg-[#121A2C] border border-[#D4AF37]/20 text-slate-100 rounded-tl-none markdown-body'
                    }`}
                  >
                    <MarkdownRenderer content={m.content} isUser={m.role === 'user'} />
                  </div>

                  {/* Attached Property Cards if available */}
                  {m.properties && m.properties.length > 0 && (
                    <div className="mt-4 w-full max-w-4xl">
                      <p className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Featured Property Matches' : 'العقارات المقترحة المطابقة'}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {m.properties.map((card, cIdx) => (
                          <div
                            key={cIdx}
                            className="glass-panel-elevated rounded-xl overflow-hidden group hover:border-[#D4AF37] transition duration-300 flex flex-col justify-between"
                          >
                            <div className="relative h-36 overflow-hidden">
                              <img
                                src={card.hero_image || 'https://cdn.darglobal.co.uk/projects_bg_1920_7938dd65f1.webp'}
                                alt={card.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                              <div className="absolute top-2 left-2 flex gap-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  card.source === 'DarGlobal' ? 'badge-darglobal' : 'badge-wasalt'
                                }`}>
                                  {card.source}
                                </span>
                                {card.luxury_brand && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                                    {card.luxury_brand}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-3.5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center text-xs text-slate-400 gap-1 mb-1">
                                  <MapPin className="w-3 h-3 text-[#D4AF37]" />
                                  <span>{card.city}, {card.country}</span>
                                </div>
                                <h4 className="font-bold text-slate-100 text-sm line-clamp-1 mb-1">
                                  {card.title}
                                </h4>
                                <p className="text-sm font-bold text-[#D4AF37] mb-2">
                                  {card.price_formatted}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                                <span>{card.bedrooms ? `${card.bedrooms} Beds` : 'Exclusive'}</span>
                                <span>{card.area_sqm} m²</span>
                                {card.url && (
                                  <a
                                    href={card.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#D4AF37] hover:underline flex items-center gap-0.5 text-xs font-semibold"
                                  >
                                    <span>Details</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-[#D4AF37] bg-[#121A2C] border border-[#D4AF37]/30 px-4 py-2.5 rounded-xl w-fit animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>AURA is synthesizing market intelligence...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 md:p-4 bg-[#0A0E1A] border-t border-[#D4AF37]/20 flex items-center gap-3">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={language === 'en' 
                  ? "Inquire about Pagani towers, Lamborghini villas, Riyadh estates, ROI, or visa rules..." 
                  : "اسأل عن أبراج باجاني، فلل لامبورغيني، عقارات الرياض، العوائد الاستثمارية، أو التأشيرة الذهبية..."}
                disabled={isStreaming}
                className="flex-1 bg-[#121826] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] transition"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isStreaming}
                className="gold-gradient-btn px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold disabled:opacity-50 transition"
              >
                <span>{language === 'en' ? 'Send' : 'إرسال'}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTY EXPLORER */}
        {activeTab === 'catalog' && (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Filter Bar */}
            <div className="glass-panel p-4 rounded-2xl border border-[#D4AF37]/20 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search projects, brands, cities, amenities..."
                  value={filters.search}
                  onChange={(e) => {
                    const next = { ...filters, search: e.target.value };
                    setFilters(next);
                    fetchProperties(next);
                  }}
                  className="w-full bg-[#0C1220] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Source Filter */}
              <select
                value={filters.source}
                onChange={(e) => {
                  const next = { ...filters, source: e.target.value };
                  setFilters(next);
                  fetchProperties(next);
                }}
                className="bg-[#0C1220] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">All Developers (DarGlobal & Wasalt)</option>
                <option value="DarGlobal">DarGlobal (Branded International)</option>
                <option value="Wasalt">Wasalt (Saudi Marketplace)</option>
              </select>

              {/* City Filter */}
              <select
                value={filters.city}
                onChange={(e) => {
                  const next = { ...filters, city: e.target.value };
                  setFilters(next);
                  fetchProperties(next);
                }}
                className="bg-[#0C1220] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">All Cities</option>
                <option value="Dubai">Dubai, UAE</option>
                <option value="Riyadh">Riyadh, KSA</option>
                <option value="Jeddah">Jeddah, KSA</option>
                <option value="Muscat">Muscat, Oman</option>
                <option value="Benahavís">Benahavís, Spain</option>
                <option value="Doha">Doha, Qatar</option>
                <option value="London">London, UK</option>
                <option value="Al Khobar">Al Khobar, KSA</option>
              </select>

              {/* Property Type */}
              <select
                value={filters.property_type}
                onChange={(e) => {
                  const next = { ...filters, property_type: e.target.value };
                  setFilters(next);
                  fetchProperties(next);
                }}
                className="bg-[#0C1220] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">All Property Types</option>
                <option value="Villa">Villas & Mansions</option>
                <option value="Apartment">Apartments</option>
                <option value="Penthouse">Penthouses & Sky Villas</option>
                <option value="Floor">Residential Floors</option>
                <option value="Land">Commercial Land</option>
              </select>

              <button
                onClick={() => {
                  const reset: FilterState = {
                    source: '',
                    city: '',
                    property_type: '',
                    min_price: 0,
                    max_price: 50000000,
                    min_beds: 0,
                    search: ''
                  };
                  setFilters(reset);
                  fetchProperties(reset);
                }}
                className="text-xs text-slate-400 hover:text-[#D4AF37] underline px-2 py-1"
              >
                Reset Filters
              </button>
            </div>

            {/* Properties Grid */}
            {isLoadingProps ? (
              <div className="flex-1 flex items-center justify-center py-20 text-[#D4AF37]">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-20 text-slate-400 glass-panel rounded-2xl">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold">No properties matched your criteria.</p>
                <p className="text-xs text-slate-500 mt-1">Try relaxing filters or search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-8">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProperty(p)}
                    className="glass-panel-elevated rounded-2xl overflow-hidden cursor-pointer hover:border-[#D4AF37] transition duration-300 flex flex-col group"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={p.hero_image}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.source === 'DarGlobal' ? 'badge-darglobal' : 'badge-wasalt'
                        }`}>
                          {p.source}
                        </span>
                        {p.luxury_brand && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                            {p.luxury_brand}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[#D4AF37] text-xs font-bold backdrop-blur-sm">
                        {p.price_formatted}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{p.city}, {p.country}</span>
                        </div>
                        <h3 className="font-bold text-slate-100 text-sm line-clamp-1 mb-2">
                          {p.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {p.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {p.bedrooms ? `${p.bedrooms} Beds` : 'Exclusive'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {p.area_sqm} m²
                        </span>
                        <span className="text-[#D4AF37] font-semibold group-hover:translate-x-1 transition">
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MORTGAGE & ROI CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="flex-1 max-w-4xl mx-auto w-full glass-panel rounded-2xl p-6 md:p-8 border border-[#D4AF37]/25 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display gold-gradient-text">Investment & Mortgage Calculator</h2>
                <p className="text-xs text-slate-400">Estimate monthly financing installments, capital outlays, and anticipated rental yield</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Sliders Section */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-300">Property Purchase Price</span>
                    <span className="text-[#D4AF37]">{calcPrice.toLocaleString()} SAR (~${Math.round(calcPrice * 0.2666).toLocaleString()} USD)</span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="45000000"
                    step="250000"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(Number(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-300">Down Payment ({downPaymentPct}%)</span>
                    <span className="text-[#D4AF37]">{downPaymentAmount.toLocaleString()} SAR</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={downPaymentPct}
                    onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-300">Loan Tenure ({loanTermYears} Years)</span>
                    <span className="text-[#D4AF37]">{loanTermYears * 12} Installments</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={loanTermYears}
                    onChange={(e) => setLoanTermYears(Number(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-300">Annual Mortgage Interest Rate</span>
                    <span className="text-[#D4AF37]">{interestRatePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="2.5"
                    max="9.0"
                    step="0.1"
                    value={interestRatePct}
                    onChange={(e) => setInterestRatePct(Number(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-300">Projected Gross Rental Yield</span>
                    <span className="text-[#10B981] font-bold">{expectedYieldPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="12.0"
                    step="0.2"
                    value={expectedYieldPct}
                    onChange={(e) => setExpectedYieldPct(Number(e.target.value))}
                    className="w-full accent-[#10B981]"
                  />
                </div>
              </div>

              {/* Computed Summary Cards */}
              <div className="space-y-4">
                <div className="glass-panel-elevated p-5 rounded-2xl border border-[#D4AF37]/30 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Estimated Monthly Payment</p>
                  <p className="text-3xl font-extrabold gold-gradient-text">
                    {Math.round(monthlyPayment).toLocaleString()} SAR
                  </p>
                  <p className="text-xs text-slate-400 mt-1">~${Math.round(monthlyPayment * 0.2666).toLocaleString()} USD / month</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0D1322] p-3.5 rounded-xl border border-slate-800">
                    <p className="text-[11px] text-slate-400 mb-1">Initial Down Payment</p>
                    <p className="text-base font-bold text-slate-100">{Math.round(downPaymentAmount).toLocaleString()} SAR</p>
                  </div>
                  <div className="bg-[#0D1322] p-3.5 rounded-xl border border-slate-800">
                    <p className="text-[11px] text-slate-400 mb-1">Financed Principal</p>
                    <p className="text-base font-bold text-slate-100">{Math.round(loanAmount).toLocaleString()} SAR</p>
                  </div>
                  <div className="bg-[#0D1322] p-3.5 rounded-xl border border-slate-800">
                    <p className="text-[11px] text-slate-400 mb-1">Est. Annual Rent</p>
                    <p className="text-base font-bold text-[#10B981]">{Math.round(annualRentalIncome).toLocaleString()} SAR</p>
                  </div>
                  <div className="bg-[#0D1322] p-3.5 rounded-xl border border-slate-800">
                    <p className="text-[11px] text-slate-400 mb-1">Net Monthly Cash Flow</p>
                    <p className={`text-base font-bold ${netMonthlyCashFlow >= 0 ? 'text-[#10B981]' : 'text-amber-400'}`}>
                      {Math.round(netMonthlyCashFlow).toLocaleString()} SAR
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-xs text-slate-300">
                  <p className="font-semibold text-[#D4AF37] mb-1">💡 Investor Advisory:</p>
                  <p>DarGlobal branded residences (Pagani, Trump, Lamborghini) typically command a 20-35% premium over standard luxury units, while Wasalt Saudi residential properties in Riyadh offer 6-9% steady rental yields backed by Vision 2030 corporate relocations.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-elevated rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#D4AF37]/40">
            <div className="relative h-64">
              <img
                src={selectedProperty.hero_image}
                alt={selectedProperty.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition"
              >
                ✕
              </button>
              <div className="absolute bottom-3 left-3 flex gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  selectedProperty.source === 'DarGlobal' ? 'badge-darglobal' : 'badge-wasalt'
                }`}>
                  {selectedProperty.source}
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md">
                  {selectedProperty.luxury_brand}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-bold font-display text-slate-100">{selectedProperty.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{selectedProperty.district}, {selectedProperty.city}, {selectedProperty.country}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#D4AF37]">{selectedProperty.price_formatted}</p>
                  <p className="text-xs text-slate-400">{selectedProperty.property_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800 text-center text-xs">
                <div className="p-2 bg-[#0C1220] rounded-lg">
                  <span className="text-slate-400 block">Bedrooms</span>
                  <strong className="text-slate-200 text-sm">{selectedProperty.bedrooms || 'Bespoke'}</strong>
                </div>
                <div className="p-2 bg-[#0C1220] rounded-lg">
                  <span className="text-slate-400 block">Bathrooms</span>
                  <strong className="text-slate-200 text-sm">{selectedProperty.bathrooms || 'En-suite'}</strong>
                </div>
                <div className="p-2 bg-[#0C1220] rounded-lg">
                  <span className="text-slate-400 block">Area</span>
                  <strong className="text-slate-200 text-sm">{selectedProperty.area_sqm} m² ({selectedProperty.area_sqft} sqft)</strong>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] mb-2">Overview</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedProperty.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] mb-2">Features & Amenities</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProperty.features.map((feat, fIdx) => (
                    <span key={fIdx} className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setCalcPrice(selectedProperty.price_sar);
                    setSelectedProperty(null);
                    setActiveTab('calculator');
                  }}
                  className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Calculate Financing</span>
                </button>
                <a
                  href={selectedProperty.url}
                  target="_blank"
                  rel="noreferrer"
                  className="gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <span>Official Project Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-elevated rounded-2xl max-w-md w-full p-6 border border-[#D4AF37]/30">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-slate-100 font-display">AI Model Configuration</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  OpenRouter Free Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#0C1220] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="minimax/minimax-m3:free">minimax/minimax-m3:free (Default / High Quality)</option>
                  <option value="nvidia/nemotron-3.5-lightning:free">nvidia/nemotron-3.5-lightning:free (Fast Reasoning)</option>
                  <option value="minimax/minimax-m2.7:free">minimax/minimax-m2.7:free (Conversational)</option>
                  <option value="liquid/lfm-2.5-2.6b:free">liquid/lfm-2.5-2.6b:free (Lightweight)</option>
                  <option value="dots-studio/dots-3-note-preview:free">dots-studio/dots-3-note-preview:free (Preview)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  All models are 100% free via OpenRouter.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  OpenRouter API Key (Optional)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#0C1220] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  If left blank, the app runs with preconfigured credentials and built-in RAG fallback.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={testConnection}
                  disabled={apiStatus === 'testing'}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]"
                >
                  {apiStatus === 'testing' ? 'Testing...' : apiStatus === 'connected' ? '✓ Connected' : 'Test Status'}
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('openrouter_key', apiKey);
                    localStorage.setItem('openrouter_model', selectedModel);
                    setIsSettingsOpen(false);
                  }}
                  className="gold-gradient-btn px-4 py-1.5 rounded-xl text-xs font-bold"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
