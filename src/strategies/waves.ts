import chalk from "chalk";
import { Interval, KLine, getKlines } from "../api/binance";
import { Fibonacci, Trade, ZigZag } from "./harmonics";

export class WaveBot {
    private symbol: string;
    private interval: Interval;
    constructor (symbol: string, interval: Interval) {
        this.symbol = symbol;
        this.interval = interval;
    }

    public getZigZags = (kline: KLine[]): ZigZag[] => {
        let zigzags: ZigZag[] = [];
        let changed = false;
        let prevDir = 0;
        for (let i = kline.length - 1; i >= 0; i--) {
            // lookback 10 periods for pivot high, pivot low
            let sh = kline[i];
            let sl = kline[i];
            for (let j = i; j > i - 10 && j > 0; j--) {
                if (Number(kline[j].low) < Number(sl.low)) {
                    sl = kline[j];
                }
                if (Number(kline[j].high) > Number(sh.high)) {
                    sh = kline[j];
                }
            }
            const ph = sh.openTime == kline[i].openTime ? kline[i].high : null;
            const pl = sl.openTime == kline[i].openTime ? kline[i].low : null;
            const dir = pl != null && ph == null ? -1 : pl == null && ph != null ? 1 : 0;
            if (prevDir == 0) {
                changed = true;
                prevDir = dir;
            } else if (prevDir == 1 && dir == -1) {
                changed = true;
                prevDir = dir;
            } else if (prevDir == -1 && dir == 1) {
                changed = true;
                prevDir = dir;
            } else {
                changed = false;
            }
            if (ph != null || pl != null) {
                let skip = false;
                if (zigzags.length > 0) {
                    if (!changed) {
                        const last = zigzags[zigzags.length - 1];
                        const value = dir == 1 ? ph : pl;
                        // @ts-ignore
                        if (last.v * dir > value * dir) {
                            skip = true;
                        } else {
                            zigzags.pop();
                        }
                    }
                }
                if (!skip) {
                    zigzags.push({ s: dir == -1 ? 'L' : 'H', v: dir == -1 ? Number(kline[i].low) : Number(kline[i].high), i: i, t: kline[i].openTime });
                }
            }
        }

        return zigzags.reverse();
    }

    public getTrade = (zigzags: ZigZag[], latestPrice: number, entryFib: Fibonacci, slFib: Fibonacci, tpFib: Fibonacci): Trade | null => {
        for (let i=0; i<zigzags.length-3; i++) {
            if (i + 3 < zigzags.length-2) {
                continue; // skip to last 3 candles
            }

            const { z1, z2, z3, z4} = {z1: zigzags[i], z2: zigzags[i+1], z3: zigzags[i+2], z4: zigzags[i+3] };
            if (z4.v > z3.v && z4.v > z2.v && z3.v > z1.v) {
                // get bullish retracement
                const minRetracement = z3.v + ((z4.v - z3.v) * (1 - entryFib * 0.8));
                const retracement = z3.v + ((z4.v - z3.v) * (1 - entryFib));
                const maxRetracement = z3.v + ((z4.v - z3.v) * (1 - entryFib * 1.2) );
                // check if current price near retracement
                // console.log(`if (${latestPrice} >= ${minRetracement} && ${latestPrice} <= ${maxRetracement}) {`);
                if (latestPrice >= minRetracement && latestPrice <= maxRetracement) {
                    if (zigzags[i+4] != null) {
                        if (zigzags[i+4].v < maxRetracement) {
                            continue; // skip bc current pivot breaks structure
                        }
                    }
                    const trade: Trade = {
                        symbol: this.symbol,
                        side: "Buy",
                        entryPrice: retracement,
                        stopLoss: z3.v + ((z4.v - z3.v) * (1 - slFib)),
                        takeProfit: z3.v + ((z4.v - z3.v) * (1 - tpFib)),
                        interval: this.interval
                    }
                    return trade;
                }
            }

            if (z4.v < z3.v && z4.v < z2.v && z3.v < z1.v) {
                // get bearish retracement
                const minRetracement = z3.v - ((z3.v - z4.v) * (1 - entryFib * 0.8));
                const retracement = z3.v - ((z3.v - z4.v) * (1 - entryFib));
                const maxRetracement = z3.v - ((z3.v - z4.v) * (1 - entryFib * 1.2));
                // check if current price near retracement
                // console.log(`if (${latestPrice} >= ${minRetracement} && ${latestPrice} <= ${maxRetracement}) {`);
                if (latestPrice >= minRetracement && latestPrice <= maxRetracement) {
                    if (zigzags[i+4] != null) {
                        if (zigzags[i+4].v > maxRetracement) {
                            continue; // skip bc current pivot breaks structure
                        }
                    }
                    const trade: Trade = {
                        symbol: this.symbol,
                        side: "Sell",
                        entryPrice: retracement,
                        stopLoss: z3.v - ((z3.v - z4.v) * (1 - slFib)),
                        takeProfit: z3.v - ((z3.v - z4.v) * (1 - tpFib)),
                        interval: this.interval
                    }
                    return trade;
                }
            }
        }

        return null;
    }

    public run = async () => {
        let candles = await getKlines({
            symbol: this.symbol,
            interval: this.interval,
            limit: 1440
        });
        const zigzags = this.getZigZags(candles);
        const trade = this.getTrade(zigzags, candles[candles.length-1].close,0.618,0.886,-1.5);

        if (trade) {
            console.log(chalk.magentaBright(`[${new Date().toLocaleTimeString()}] ${trade.interval} $${this.symbol} ${trade.side == "Buy" ? "Bullish" : "Bearish"} retracement detected ▒ ${chalk.yellowBright(`${trade.side} Entry: ${trade.entryPrice}`)} ${chalk.redBright(`SL: ${trade.stopLoss}`)} ${chalk.greenBright(`TP: ${trade.takeProfit}`)}`));
        }
    }
}