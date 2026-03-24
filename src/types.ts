export type LottoCategory = 'set-for-life' | 'lotto' | 'euromillions' | 'thunderball' | 'lotto-hotpicks' | 'euromillions-5';

export interface LottoConfig {
  id: LottoCategory;
  name: string;
  drawDays: string[];
  mainBalls: number;
  maxMain: number;
  bonusBalls: number;
  maxBonus?: number;
}

export const LOTTO_CONFIGS: Record<LottoCategory, LottoConfig> = {
  'set-for-life': {
    id: 'set-for-life',
    name: 'Set For Life',
    drawDays: ['Monday', 'Thursday'],
    mainBalls: 5,
    maxMain: 47,
    bonusBalls: 1,
    maxBonus: 10
  },
  'lotto': {
    id: 'lotto',
    name: 'Lotto',
    drawDays: ['Saturday', 'Wednesday'],
    mainBalls: 6,
    maxMain: 59,
    bonusBalls: 1,
    maxBonus: 59
  },
  'euromillions': {
    id: 'euromillions',
    name: 'EuroMillions',
    drawDays: ['Friday', 'Tuesday'],
    mainBalls: 5,
    maxMain: 50,
    bonusBalls: 2,
    maxBonus: 12
  },
  'thunderball': {
    id: 'thunderball',
    name: 'Thunderball',
    drawDays: ['Saturday', 'Tuesday'],
    mainBalls: 5,
    maxMain: 39,
    bonusBalls: 1,
    maxBonus: 14
  },
  'lotto-hotpicks': {
    id: 'lotto-hotpicks',
    name: 'Lotto HotPicks',
    drawDays: ['Saturday', 'Wednesday'],
    mainBalls: 6,
    maxMain: 59,
    bonusBalls: 0
  },
  'euromillions-5': {
    id: 'euromillions-5',
    name: 'EuroMillions (5 Balls)',
    drawDays: ['Friday', 'Tuesday'],
    mainBalls: 5,
    maxMain: 50,
    bonusBalls: 0
  }
};

export interface LottoResult {
  id: string;
  date: string;
  category: LottoCategory;
  numbers: number[];
  bonusNumbers?: number[];
}

export interface NumberStat {
  number: number;
  frequency: number;
  lastSeen: number;
  isHot: boolean;
  isCold: boolean;
}

export interface LottoStats {
  totalDraws: number;
  numberStats: NumberStat[];
  bonusStats?: NumberStat[];
  mostFrequentPairs: [number, number, number][];
  averageSum: number;
  oddEvenRatio: { odd: number; even: number };
}
