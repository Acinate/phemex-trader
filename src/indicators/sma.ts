import { KLine } from "../api/binance";

export const calculateMovingAverages = (data: number[], periodSlow: number, periodFast: number) => {
    const smaSlow = calculateSMA(data, periodSlow);
    const smaFast = calculateSMA(data, periodFast);

    return { slow: smaSlow, fast: smaFast };
}

export const calculateSMA = (data: number[], period: number) => {
    const smaValues = [];

    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, value) => acc + value, 0);
        const sma = sum / period;
        smaValues.push(sma);
    }

    return smaValues;
}

export interface MovingAverages {
    slow: number[];
    fast: number[];
}

export const getMovingAverages = async (kline: KLine[], periodSlow: number, periodFast: number): Promise<MovingAverages> => {
    const data = kline.map((k: KLine) => k.close);
    const movingAverages = calculateMovingAverages(data, periodSlow, periodFast);

    return {
        slow: movingAverages.slow,
        fast: movingAverages.fast
    }
}
