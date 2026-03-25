import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  History, 
  Plus, 
  Trash2, 
  Dna, 
  BarChart3, 
  Calculator,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LottoResult, LottoCategory, LOTTO_CONFIGS } from './types';
import { calculateStats, generatePrediction } from './utils/statistics';
import { fetchLatestLotteryResults } from './services/lottoService';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [results, setResults] = useState<LottoResult[]>([]);
  const [currentCategory, setCurrentCategory] = useState<LottoCategory>('lotto');
  const [newNumbers, setNewNumbers] = useState<string>('');
  const [newBonusNumbers, setNewBonusNumbers] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [prediction, setPrediction] = useState<{ main: number[], bonus: number[] }>({ main: [], bonus: [] });
  const [storedPredictions, setStoredPredictions] = useState<{ id: string, category: LottoCategory, date: string, main: number[], bonus: number[] }[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'predict'>('stats');
  const [isFetching, setIsFetching] = useState(false);

  const config = LOTTO_CONFIGS[currentCategory];

  // Load data
  useEffect(() => {
    const savedResults = localStorage.getItem('lotto_results_v2');
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
    const savedPredictions = localStorage.getItem('lotto_stored_predictions');
    if (savedPredictions) {
      setStoredPredictions(JSON.parse(savedPredictions));
    }
  }, []);

  // Save data
  useEffect(() => {
    if (results.length > 0) {
      localStorage.setItem('lotto_results_v2', JSON.stringify(results));
    }
  }, [results]);

  useEffect(() => {
    localStorage.setItem('lotto_stored_predictions', JSON.stringify(storedPredictions));
  }, [storedPredictions]);

  const stats = useMemo(() => calculateStats(results, config), [results, currentCategory]);

  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = newNumbers.split(/[, ]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= config.maxMain);
    const bonusNums = newBonusNumbers.split(/[, ]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && (config.maxBonus ? n <= config.maxBonus : true));
    
    if (nums.length !== config.mainBalls) {
      alert(`Please enter exactly ${config.mainBalls} numbers between 1 and ${config.maxMain}`);
      return;
    }

    if (config.bonusBalls > 0 && bonusNums.length !== config.bonusBalls) {
      alert(`Please enter exactly ${config.bonusBalls} bonus numbers`);
      return;
    }

    const newResult: LottoResult = {
      id: Date.now().toString(),
      date: newDate,
      category: currentCategory,
      numbers: nums.sort((a, b) => a - b),
      bonusNumbers: bonusNums.sort((a, b) => a - b),
    };

    setResults([newResult, ...results]);
    setNewNumbers('');
    setNewBonusNumbers('');
  };

  const handleDeleteResult = (id: string) => {
    setResults(results.filter(r => r.id !== id));
  };

  const handleGeneratePrediction = () => {
    const newPred = generatePrediction(stats, config);
    setPrediction(newPred);
    
    // Automatically store the generated prediction
    const storedPred = {
      id: Date.now().toString(),
      category: currentCategory,
      date: new Date().toLocaleString(),
      main: newPred.main,
      bonus: newPred.bonus
    };
    setStoredPredictions(prev => [storedPred, ...prev].slice(0, 50)); // Keep last 50
  };

  const handleDeleteStoredPrediction = (id: string) => {
    setStoredPredictions(prev => prev.filter(p => p.id !== id));
  };

  const handleClearStoredPredictions = () => {
    if (confirm('Clear all stored predictions?')) {
      setStoredPredictions([]);
    }
  };

  const handleFetchLatest = async () => {
    setIsFetching(true);
    try {
      const latest = await fetchLatestLotteryResults(currentCategory);
      if (latest && latest.length > 0) {
        setResults(prev => {
          const existingIds = new Set(prev.map(r => `${r.category}-${r.date}`));
          const filteredLatest = latest.filter(r => !existingIds.has(`${r.category}-${r.date}`));
          return [...filteredLatest, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      }
    } finally {
      setIsFetching(false);
    }
  };

  const chartData = useMemo(() => {
    return stats.numberStats.map(s => ({
      name: s.number,
      freq: s.frequency,
      isHot: s.isHot,
      isCold: s.isCold
    }));
  }, [stats]);

  const pieData = [
    { name: 'Odd', value: stats.oddEvenRatio.odd },
    { name: 'Even', value: stats.oddEvenRatio.even },
  ];

  const COLORS = ['#f59e0b', '#3b82f6'];

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-serif italic font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            LottoStat Predictor
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm opacity-60 font-mono uppercase tracking-widest">Category:</p>
            <select 
              value={currentCategory}
              onChange={(e) => setCurrentCategory(e.target.value as LottoCategory)}
              className="bg-transparent border-b border-[#141414] font-mono text-xs uppercase p-1 focus:outline-none"
            >
              {Object.values(LOTTO_CONFIGS).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleFetchLatest}
            disabled={isFetching}
            className="px-4 py-2 text-xs font-mono uppercase tracking-tighter border border-[#141414] bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
            {isFetching ? 'Fetching...' : 'Fetch Latest Results'}
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-tighter border border-[#141414] transition-all",
              activeTab === 'stats' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
            )}
          >
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-tighter border border-[#141414] transition-all",
              activeTab === 'history' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
            )}
          >
            History
          </button>
          <button 
            onClick={() => setActiveTab('predict')}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-tighter border border-[#141414] transition-all",
              activeTab === 'predict' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
            )}
          >
            Predictions
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Quick Stats */}
        <div className="lg:col-span-4 space-y-8">
          {/* Data Entry */}
          <section className="border border-[#141414] p-6 bg-white/50 backdrop-blur-sm">
            <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
              <Plus className="w-3 h-3" />
              Add Draw Result
            </h2>
            <form onSubmit={handleAddResult} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1 opacity-40">Draw Date</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-transparent border-b border-[#141414] p-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1 opacity-40">Main Numbers ({config.mainBalls} values, 1-{config.maxMain})</label>
                <input 
                  type="text" 
                  placeholder={`e.g. ${Array.from({length: config.mainBalls}, (_, i) => i + 1).join(', ')}`}
                  value={newNumbers}
                  onChange={(e) => setNewNumbers(e.target.value)}
                  className="w-full bg-transparent border-b border-[#141414] p-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {config.bonusBalls > 0 && (
                <div>
                  <label className="block text-[10px] font-mono uppercase mb-1 opacity-40">Bonus/Special Balls ({config.bonusBalls} values, 1-{config.maxBonus})</label>
                  <input 
                    type="text" 
                    placeholder={`e.g. ${Array.from({length: config.bonusBalls}, (_, i) => i + 1).join(', ')}`}
                    value={newBonusNumbers}
                    onChange={(e) => setNewBonusNumbers(e.target.value)}
                    className="w-full bg-transparent border-b border-[#141414] p-2 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}
              <button 
                type="submit"
                className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-xs font-mono uppercase tracking-widest hover:invert transition-all flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4" />
                Commit to Database
              </button>
            </form>
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="border border-[#141414] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase opacity-40">Total Draws</span>
              <span className="text-3xl font-serif italic font-bold">{stats.totalDraws}</span>
            </div>
            <div className="border border-[#141414] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase opacity-40">Avg Sum</span>
              <span className="text-3xl font-serif italic font-bold">{stats.averageSum.toFixed(1)}</span>
            </div>
          </section>

          {/* Hot/Cold Lists */}
          <section className="border border-[#141414] p-6">
            <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-6 flex items-center gap-2">
              <BarChart3 className="w-3 h-3" />
              Statistical Extremes
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-mono uppercase text-amber-600 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                  Hot Numbers (High Freq)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.numberStats
                    .filter(s => s.isHot)
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 8)
                    .map(s => (
                      <div key={s.number} className="w-8 h-8 border border-[#141414] flex items-center justify-center text-xs font-mono bg-amber-50">
                        {s.number}
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-mono uppercase text-blue-600 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Cold Numbers (Low Freq)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.numberStats
                    .filter(s => s.isCold)
                    .sort((a, b) => a.frequency - b.frequency)
                    .slice(0, 8)
                    .map(s => (
                      <div key={s.number} className="w-8 h-8 border border-[#141414] flex items-center justify-center text-xs font-mono bg-blue-50">
                        {s.number}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Frequency Chart */}
                <section className="border border-[#141414] p-6 bg-white/30 h-[400px]">
                  <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" />
                    Number Frequency Distribution
                  </h2>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#141414" opacity={0.1} vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontFamily: 'monospace' }} 
                        stroke="#141414"
                        interval={2}
                      />
                      <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#141414" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141414', color: '#E4E3E0', border: 'none', fontFamily: 'monospace', fontSize: '10px' }}
                        cursor={{ fill: '#141414', opacity: 0.05 }}
                      />
                      <Bar dataKey="freq">
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isHot ? '#f59e0b' : entry.isCold ? '#3b82f6' : '#141414'} 
                            fillOpacity={entry.isHot || entry.isCold ? 0.8 : 0.4}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Odd/Even Ratio */}
                  <section className="border border-[#141414] p-6 bg-white/30">
                    <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-6">Odd vs Even Balance</h2>
                    <div className="h-[200px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 ml-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500" />
                          <span className="text-[10px] font-mono uppercase">Odd: {stats.oddEvenRatio.odd}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500" />
                          <span className="text-[10px] font-mono uppercase">Even: {stats.oddEvenRatio.even}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Frequent Pairs */}
                  <section className="border border-[#141414] p-6 bg-white/30">
                    <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-6">Top Recurring Pairs</h2>
                    <div className="space-y-2">
                      {stats.mostFrequentPairs.slice(0, 5).map((pair, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-[#141414]/10 pb-2">
                          <div className="flex gap-2">
                            <span className="w-6 h-6 border border-[#141414] flex items-center justify-center text-[10px] font-mono">{pair[0]}</span>
                            <span className="w-6 h-6 border border-[#141414] flex items-center justify-center text-[10px] font-mono">{pair[1]}</span>
                          </div>
                          <span className="text-[10px] font-mono opacity-40 uppercase">{pair[2]} occurrences</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-[#141414] bg-white/30 overflow-hidden"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#141414] bg-[#141414] text-[#E4E3E0]">
                      <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Date</th>
                      <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Category</th>
                      <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Numbers</th>
                      <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(r => r.category === currentCategory).map((res) => (
                      <tr key={res.id} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors">
                        <td className="p-4 font-mono text-sm">{res.date}</td>
                        <td className="p-4 text-[10px] font-mono uppercase opacity-60">{LOTTO_CONFIGS[res.category]?.name}</td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {res.numbers.map((n, i) => (
                              <span key={i} className="w-7 h-7 border border-[#141414] flex items-center justify-center text-xs font-mono">
                                {n}
                              </span>
                            ))}
                            {res.bonusNumbers?.map((n, i) => (
                              <span key={i} className="w-7 h-7 border border-[#141414] bg-amber-200 flex items-center justify-center text-xs font-mono">
                                {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteResult(res.id)}
                            className="text-red-600 hover:bg-red-50 p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {results.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center opacity-40 font-mono text-xs uppercase tracking-widest">
                          No draw data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'predict' && (
              <motion.div 
                key="predict"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <section className="border border-[#141414] p-12 bg-white/50 text-center space-y-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <Dna className="w-12 h-12 mx-auto opacity-20" />
                    <h2 className="text-2xl font-serif italic font-bold">Probability Engine</h2>
                    <p className="text-xs font-mono opacity-60 uppercase leading-relaxed">
                      Our algorithm weights numbers based on historical frequency, "overdue" gaps, and statistical variance to generate the most probable next sequence.
                    </p>
                  </div>

                  <div className="flex justify-center gap-4 flex-wrap">
                    {prediction.main.length > 0 ? (
                      <>
                        {prediction.main.map((n, i) => (
                          <motion.div 
                            key={`main-${i}`}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: i * 0.1, type: 'spring' }}
                            className="w-16 h-16 border-2 border-[#141414] flex items-center justify-center text-2xl font-serif italic font-bold bg-[#141414] text-[#E4E3E0] shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]"
                          >
                            {n}
                          </motion.div>
                        ))}
                        {prediction.bonus.map((n, i) => (
                          <motion.div 
                            key={`bonus-${i}`}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: (prediction.main.length + i) * 0.1, type: 'spring' }}
                            className="w-16 h-16 border-2 border-[#141414] flex items-center justify-center text-2xl font-serif italic font-bold bg-amber-400 text-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]"
                          >
                            {n}
                          </motion.div>
                        ))}
                      </>
                    ) : (
                      <div className="flex gap-4">
                        {Array.from({length: config.mainBalls + config.bonusBalls}).map((_, i) => (
                          <div key={i} className="w-16 h-16 border-2 border-[#141414] border-dashed flex items-center justify-center opacity-20">
                            ?
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleGeneratePrediction}
                    className="bg-[#141414] text-[#E4E3E0] px-8 py-4 text-sm font-mono uppercase tracking-widest hover:invert transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Run Simulation
                  </button>
                </section>

                {/* Stored Predictions Box */}
                <section className="border border-[#141414] p-6 bg-white/30">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 flex items-center gap-2">
                      <History className="w-3 h-3" />
                      Stored Predictions History
                    </h2>
                    {storedPredictions.length > 0 && (
                      <button 
                        onClick={handleClearStoredPredictions}
                        className="text-[10px] font-mono uppercase opacity-40 hover:opacity-100 transition-opacity"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {storedPredictions.length > 0 ? (
                      storedPredictions.map((pred) => (
                        <div key={pred.id} className="border border-[#141414]/10 p-4 bg-white/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-mono uppercase opacity-40">{pred.date}</span>
                              <span className="text-[10px] font-mono uppercase bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5">{LOTTO_CONFIGS[pred.category]?.name}</span>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {pred.main.map((n, i) => (
                                <span key={i} className="w-8 h-8 border border-[#141414] flex items-center justify-center text-xs font-mono bg-white">
                                  {n}
                                </span>
                              ))}
                              {pred.bonus.map((n, i) => (
                                <span key={i} className="w-8 h-8 border border-[#141414] flex items-center justify-center text-xs font-mono bg-amber-200">
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteStoredPrediction(pred.id)}
                            className="text-red-600 hover:bg-red-50 p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 opacity-30 font-mono text-[10px] uppercase tracking-widest">
                        No predictions stored yet
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border border-[#141414] p-6 bg-amber-50/50">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      Methodology Note
                    </h3>
                    <p className="text-[10px] font-mono opacity-60 leading-relaxed">
                      This system uses a weighted random selection algorithm. Numbers that appear more frequently in your history or haven't appeared for a long time are given higher weight in the "pool" before selection.
                    </p>
                  </div>
                  <div className="border border-[#141414] p-6 bg-blue-50/50">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      Statistical Confidence
                    </h3>
                    <p className="text-[10px] font-mono opacity-60 leading-relaxed">
                      Confidence increases with the volume of historical data. We recommend at least 20-30 previous draws for meaningful statistical patterns to emerge.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#141414] p-8 text-center">
        <p className="text-[10px] font-mono uppercase opacity-30 tracking-[0.2em]">
          &copy; 2026 LottoStat Predictor // Built for Statistical Research
        </p>
      </footer>
    </div>
  );
}
