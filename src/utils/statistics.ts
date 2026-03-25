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
  const predictSet = (numStats: NumberStat[], count: number, isMain: boolean) => {
    if (stats.totalDraws < 5) {
      const nums = new Set<number>();
      const max = numStats.length;
      while (nums.size < count) {
        nums.add(Math.floor(Math.random() * max) + 1);
      }
      return Array.from(nums).sort((a, b) => a - b);
    }

    // Create a weighted pool
    const pool: number[] = [];
    numStats.forEach(stat => {
      // Weight by frequency (Hot numbers)
      const freqWeight = Math.max(1, stat.frequency);
      // Weight by "overdue" factor (Cold/Overdue numbers)
      const overdueWeight = Math.floor(stat.lastSeen / 1.5);
      
      const totalWeight = freqWeight + overdueWeight + 2;
      for (let i = 0; i < totalWeight; i++) pool.push(stat.number);
    });

    // Generate multiple candidates and score them
    const candidates: { set: number[], score: number }[] = [];
    const maxCandidates = 100;

    for (let c = 0; c < maxCandidates; c++) {
      const currentSet = new Set<number>();
      while (currentSet.size < count) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        currentSet.add(pool[randomIndex]);
      }
      const sortedSet = Array.from(currentSet).sort((a, b) => a - b);
      
      // Scoring logic (only for main balls)
      let score = 0;
      if (isMain) {
        // 1. Sum Range Check
        const sum = sortedSet.reduce((a, b) => a + b, 0);
        const diffFromAvg = Math.abs(sum - stats.averageSum);
        score += Math.max(0, 50 - diffFromAvg);

        // 2. Odd/Even Balance (Ideal is 50/50 or close)
        const odds = sortedSet.filter(n => n % 2 !== 0).length;
        const evens = count - odds;
        const oddEvenDiff = Math.abs(odds - evens);
        score += (count - oddEvenDiff) * 10;

        // 3. High/Low Balance
        const midPoint = config.maxMain / 2;
        const lows = sortedSet.filter(n => n <= midPoint).length;
        const highs = count - lows;
        const highLowDiff = Math.abs(lows - highs);
        score += (count - highLowDiff) * 10;

        // 4. Consecutive Numbers (1 pair is okay, more is rare)
        let consecutives = 0;
        for (let i = 0; i < sortedSet.length - 1; i++) {
          if (sortedSet[i+1] - sortedSet[i] === 1) consecutives++;
        }
        if (consecutives === 1) score += 15;
        else if (consecutives === 0) score += 10;
        else score -= 20;

        // 5. Last Digit Diversity
        const lastDigits = new Set(sortedSet.map(n => n % 10));
        score += lastDigits.size * 5;
      } else {
        score = Math.random(); // Random for bonus
      }

      candidates.push({ set: sortedSet, score });
    }

    // Return the best candidate
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].set;
  };

  return {
    main: predictSet(stats.numberStats, config.mainBalls, true),
    bonus: stats.bonusStats ? predictSet(stats.bonusStats, config.bonusBalls, false) : []
  };
};
