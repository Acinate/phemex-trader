import { KLine } from "../api/binance";

function calculateBollingerBands(data: number[], period: number, deviationMultiplier: number) {
    const smaValues = calculateSMA(data, period);
    const smaValues2 = calculateSMA(data, 4);
    const standardDeviationValues = calculateStandardDeviation(data, period);

    const upperBand = smaValues.map((sma, i) => sma + (deviationMultiplier * standardDeviationValues[i]));
    const lowerBand = smaValues.map((sma, i) => sma - (deviationMultiplier * standardDeviationValues[i]));

    return { upperBand, sma: smaValues, lowerBand, ema: smaValues2 };
}

function calculateSMA(data: number[], period: number) {
    const smaValues = [];

    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, value) => acc + value, 0);
        const sma = sum / period;
        smaValues.push(sma);
    }

    return smaValues;
}

function calculateStandardDeviation(data: number[], period: number) {
    const standardDeviationValues = [];

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((acc, value) => acc + value, 0) / period;
        const squaredDifferences = slice.map(value => Math.pow(value - mean, 2));
        const variance = squaredDifferences.reduce((acc, value) => acc + value, 0) / period;
        const standardDeviation = Math.sqrt(variance);
        standardDeviationValues.push(standardDeviation);
    }

    return standardDeviationValues;
}

export const getBollingerBands = async (kline: KLine[], period: number, deviation: number) => {
    const data = kline.map((k: KLine) => k.close);
    const bollingerBands = calculateBollingerBands(data, period, deviation);

    return {
        upperBand: bollingerBands.upperBand[bollingerBands.upperBand.length - 1],
        sma: bollingerBands.sma[bollingerBands.sma.length - 1],
        lowerBand: bollingerBands.lowerBand[bollingerBands.lowerBand.length - 1],
        ema: bollingerBands.ema[bollingerBands.ema.length - 1]
    }
}
