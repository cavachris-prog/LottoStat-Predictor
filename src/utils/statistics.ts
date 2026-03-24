import { LottoResult, LottoStats, NumberStat, LottoConfig } from '../types';

export const calculateStats = (results: LottoResult[], config: LottoConfig): LottoStats => {
  const categoryResults = results.filter(r => r.category === config.id);
  const totalDraws = categoryResults.length;
  
  const processStats = (numsList: number[][], max: number) => {
    const frequencyMap: Record<number, number> = {};
    const lastSeenMap: Record<number, number> = {};
    
    for (let i = 1; i <= max; i++) {
      frequencyMap[i] = 0;
      lastSeenMap[i] = totalDraws;
    }

    numsList.forEach((nums, index) => {
      nums.forEach(num => {
        if (num > 0 && num <= max) {
          frequencyMap[num]++;
          if (lastSeenMap[num] === totalDraws) {
            lastSeenMap[num] = index;
          }
        }
      });
    });

    const sortedFreqs = Object.values(frequencyMap).sort((a, b) => b - a);
    const hotThreshold = sortedFreqs[Math.floor(max * 0.2)] || 0;
    const coldThreshold = sortedFreqs[Math.floor(max * 0.8)] || 0;

    return Object.keys(frequencyMap).map(numStr => {
      const num = parseInt(numStr);
      return {
        number: num,
        frequency: frequencyMap[num],
        lastSeen: lastSeenMap[num],
        isHot: frequencyMap[num] >= hotThreshold && frequencyMap[num] > 0,
        isCold: frequencyMap[num] <= coldThreshold || frequencyMap[num] === 0,
      };
    });
  };

  const numberStats = processStats(categoryResults.map(r => r.numbers), config.maxMain);
  const bonusStats = config.bonusBalls > 0 && config.maxBonus 
    ? processStats(categoryResults.map(r => r.bonusNumbers || []), config.maxBonus)
    : undefined;

  // Pair analysis
  const pairMap: Record<string, number> = {};
  categoryResults.forEach(result => {
    for (let i = 0; i < result.numbers.length; i++) {
      for (let j = i + 1; j < result.numbers.length; j++) {
        const pair = [result.numbers[i], result.numbers[j]].sort((a, b) => a - b).join(',');
        pairMap[pair] = (pairMap[pair] || 0) + 1;
      }
    }
  });

  const mostFrequentPairs: [number, number, number][] = Object.entries(pairMap)
    .map(([pairStr, count]) => {
      const [n1, n2] = pairStr.split(',').map(Number);
      return [n1, n2, count] as [number, number, number];
    })
    .sort((a, b) => b[2] - a[2])
    .slice(0, 10);

  const totalSum = categoryResults.reduce((acc, res) => acc + res.numbers.reduce((s, n) => s + n, 0), 0);
  const averageSum = totalDraws > 0 ? totalSum / totalDraws : 0;

  let oddCount = 0;
  let evenCount = 0;
  categoryResults.forEach(res => {
    res.numbers.forEach(n => {
      if (n % 2 === 0) evenCount++;
      else oddCount++;
    });
  });

  return {
    totalDraws,
    numberStats,
    bonusStats,
    mostFrequentPairs,
    averageSum,
    oddEvenRatio: { odd: oddCount, even: evenCount },
  };
};

export const generatePrediction = (stats: LottoStats, config: LottoConfig): { main: number[], bonus: number[] } => {
  const predictSet = (numStats: NumberStat[], count: number) => {
    if (stats.totalDraws < 3) {
      const nums = new Set<number>();
      const max = numStats.length;
      while (nums.size < count) {
        nums.add(Math.floor(Math.random() * max) + 1);
      }
      return Array.from(nums).sort((a, b) => a - b);
    }

    const pool: number[] = [];
    numStats.forEach(stat => {
      for (let i = 0; i < stat.frequency; i++) pool.push(stat.number);
      for (let i = 0; i < Math.floor(stat.lastSeen / 2); i++) pool.push(stat.number);
      pool.push(stat.number);
    });

    const prediction = new Set<number>();
    while (prediction.size < count) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      prediction.add(pool[randomIndex]);
    }
    return Array.from(prediction).sort((a, b) => a - b);
  };

  return {
    main: predictSet(stats.numberStats, config.mainBalls),
    bonus: stats.bonusStats ? predictSet(stats.bonusStats, config.bonusBalls) : []
  };
};
