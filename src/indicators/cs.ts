// Reference image to all candlesticks: https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.redd.it%2Fd6du22iwbbt61.jpg&f=1&nofb=1&ipt=eeb4e3404b7a0da7fb82ba630321e220980b653b433aa99e1e43130871044770&ipo=images

import { KLine } from "../api/binance";

// TODO: Large Bull
export const isLargeBull = (kline: KLine): boolean => {
    // body 80% of candle (close - open)
    // top wick <= 20% of candle (high - close)
    if (kline.close < kline.open) return false;
    const height = kline.high - kline.low;
    const body = kline.close - kline.open;
    const topWick = kline.high - kline.close;
    const bottomWick = kline.close - kline.low;
    return (body / height >= 0.8) && (topWick / height <= 0.2);
}
// TODO: Large Bear
export const isLargeBear = (kline: KLine) => {
    // body 80% of candle (close - open)
    // bottom wick <= 20% of candle (close - low)
    if (kline.open < kline.close) return false;
    const height = kline.high - kline.low;
    const body = kline.open - kline.close;
    const topWick = kline.high - kline.open;
    const bottomWick = kline.close - kline.low;
    return (body / height >= 0.8) && (bottomWick / height <= 0.2);
}

// TODO: Marubozu
// TODO: Marubozu Bull
// TODO: Marubozu Bear

// TODO: Bull Hammer (appears at bottom of trend)
export const isBullHammer = (kline: KLine) => {
    // body is <= 50% of candle
    // bottom wick is 90% of non-body space
    const isBull = kline.close > kline.open;
    const height = kline.high - kline.low;
    const body = isBull ? kline.close - kline.open : kline.open - kline.close;
    const topWick = isBull ? kline.high - kline.close : kline.high - kline.open;
    const bottomWick = isBull ? kline.open - kline.low : kline.close - kline.low;
    return (bottomWick >= body * 1.786) && (topWick <= height * 0.20);
}

// TODO: Test if return same candles as bullhammer
export const isBullBottom = (kline: KLine) => {
    const isBull = kline.close > kline.open;
    const height = kline.high - kline.low;
    const body = isBull ? kline.close - kline.open : kline.open - kline.close;
    const topWick = isBull ? kline.high - kline.close : kline.high - kline.open;
    const bottomWick = isBull ? kline.open - kline.low : kline.close - kline.low;
    return (bottomWick >= body * 1.5) && (topWick <= height * 0.20) && (bottomWick >= topWick * 2);
}

// TODO: Bear Hanging Man (appears at top of trend)
export const isHangingMan = (kline: KLine) => {
    const isBull = kline.close > kline.open;
    const height = kline.high - kline.low;
    const body = isBull ? kline.close - kline.open : kline.open - kline.close;
    const topWick = isBull ? kline.high - kline.open : kline.high - kline.close;
    const bottomWick = isBull ? kline.open - kline.low : kline.close - kline.low;
    return (bottomWick >= body * 1.786) && (topWick <= height * 0.20);
}
// TODO: Bull Inverted Hammer
// TODO: Bear Shooting Star

// TODO: Spinning Top
