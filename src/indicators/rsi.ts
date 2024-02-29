import { KLine } from "../api/binance";

export const getRsi = (ohlcArray: KLine[], period = 14) => {
    // Ensure there are enough data points
    if (ohlcArray.length <= period) {
        throw new Error("Not enough data points to calculate RSI");
    }

    // Calculate price changes
    const changes = ohlcArray.map((candle, index) => {
        if (index === 0) {
            return 0; // No change for the first data point
        } else {
            return candle.close - ohlcArray[index - 1].close;
        }
    });

    // Calculate average gains and losses
    const gains = [];
    const losses = [];

    for (let i = 1; i < changes.length; i++) {
        if (changes[i] > 0) {
            gains.push(changes[i]);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(-changes[i]);
        }
    }

    const avgGain = calculateAverage(gains.slice(gains.length-1-period));
    const avgLoss = calculateAverage(losses.slice(gains.length-1-period));

    // Calculate RSI
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

function calculateAverage(values: number[]) {
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}
