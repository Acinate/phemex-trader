import chalk from "chalk";
import { Interval, KLine, getKlines } from "../api/binance";
import { TradeClient, TradeManager } from "../trade_client";
import { WaveBot } from "./waves";

const printBotName = () => {
    console.log(chalk.blue(
        `
██░ ██  ███▄ ▄███▓▄▄▄█████▓ ██▀███   ▄▄▄      ▓█████▄ ▓█████  ██▀███  
▓██░ ██▒▓██▒▀█▀ ██▒▓  ██▒ ▓▒▓██ ▒ ██▒▒████▄    ▒██▀ ██▌▓█   ▀ ▓██ ▒ ██▒
▒██▀▀██░▓██    ▓██░▒ ▓██░ ▒░▓██ ░▄█ ▒▒██  ▀█▄  ░██   █▌▒███   ▓██ ░▄█ ▒
░▓█ ░██ ▒██    ▒██ ░ ▓██▓ ░ ▒██▀▀█▄  ░██▄▄▄▄██ ░▓█▄   ▌▒▓█  ▄ ▒██▀▀█▄  
░▓█▒░██▓▒██▒   ░██▒  ▒██▒ ░ ░██▓ ▒██▒ ▓█   ▓██▒░▒████▓ ░▒████▒░██▓ ▒██▒
▒ ░░▒░▒░ ▒░   ░  ░  ▒ ░░   ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░ ▒▒▓  ▒ ░░ ▒░ ░░ ▒▓ ░▒▓░
▒ ░▒░ ░░  ░      ░    ░      ░▒ ░ ▒░  ▒   ▒▒ ░ ░ ▒  ▒  ░ ░  ░  ░▒ ░ ▒░
░  ░░ ░░      ░     ░        ░░   ░   ░   ▒    ░ ░  ░    ░     ░░   ░ 
░  ░  ░       ░               ░           ░  ░   ░       ░  ░   ░     
░                      
`));
}

export interface ZigZag { s: string, v: number, i: number, t: number };

export interface Ratio {
    xab: number;
    abc: number;
    bcd: number;
    xad: number;
    bcpd?: number;
    axpd?: number;
}

export interface Trade {
    symbol: string;
    side: "Buy" | "Sell";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    interval?: Interval;
}

export interface Pattern {
    name: "Gartley" | "Crab" | "Bat" | "Butterfly" | "Shark" | "Cypher";
    X: number;
    A: number;
    B: number;
    C: number;
    D: number;
    xabRatio: number;
    abcRatio: number;
    bcdRatio: number;
    xadRatio: number;
    direction: -1 | 1;
    abcDeg?: number;
    bcaDeg?: number;
    cabDeg?: number;
    reversal?: number;
}

export type Fibonacci = 1.272 | 1.113 | 1 | 0.886 | 0.786 | 0.618 | 0.50 | 0.382 | 0.236 | 0.113 | 0 | -0.272 | -0.618 | -1.50 | -1.5 | -1.618
type Mode = "normal" | "projections" | "reversals";

export class HarmonicBot {
    private symbol: string;
    private interval: Interval;
    private client: TradeClient;

    private mode: Mode;
    private tradingEnabled = false;
    private frontrunPercent: number; // TODO: Front run percent
    private errorPercent: number;
    private errMin: number;
    private errMax: number;
    private window: number;

    private gartley = true;
    private crab = false;
    private deepCrab = false;
    private bat = true;
    private butterfly = false;
    private shark = true;
    private cypher = false;

    private detectCurrentBar = true;

    private riskRatio = 4;

    constructor(symbol: string, interval: Interval, mode: Mode, manager: TradeManager) {
        this.symbol = symbol;
        this.interval = interval;
        this.mode = mode;
        this.client = new TradeClient(manager);
        this.frontrunPercent = 0;
        this.errorPercent = 10;
        this.errMin = (100 - this.errorPercent) / 100;
        this.errMax = (100 + this.errorPercent) / 100;
        this.window = 5;
    }

    public setTradingEnabled = (enabled: boolean) => {
        this.tradingEnabled = enabled;
    }

    public setPatterns = (patterns: {gartley: boolean, crab: boolean, bat: boolean, butterfly: boolean, shark: boolean, cypher: boolean}) => {
        this.gartley = patterns.gartley;
        this.crab = patterns.crab;
        this.bat = patterns.bat;
        this.butterfly = patterns.butterfly;
        this.shark = patterns.shark;
        this.cypher = patterns.cypher;
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

        // // TODO: Add missing kline front values as last leg E
        // const i = kline.findIndex(k => k.openTime > zigzags[zigzags.length-1].t);
        // const leftOvercandles = kline.slice(i);
        // let swing = kline[i].low;
        // for (let i=0; i<leftOvercandles.length; i++) {
        //     if (zigzags[zigzags.length-1].s == 'H') {
        //         swing = leftOvercandles[i].low < swing ? leftOvercandles[i].low : swing; 
        //     } else {
        //         swing = leftOvercandles[i].high > swing ? leftOvercandles[i].low : swing; 
        //     }
        // }

        return zigzags.reverse();
    }

    public getPatternOld = (zigzags: ZigZag[]): Trade | null => {
        for (let i = 0; i < zigzags.length - 4; i++) {
            const zigzag = [zigzags[i], zigzags[i + 1], zigzags[i + 2], zigzags[i + 3], zigzags[i + 4]];
            const { X, A, B, C, D } = { X: zigzag[0].v, A: zigzag[1].v, B: zigzag[2].v, C: zigzag[3].v, D: zigzag[4].v };

            const dir = X > A ? -1 : 1

            const xabRatio = (A - B) / (A - X);
            const abcRatio = (B - C) / (B - A);
            const bcdRatio = (C - D) / (C - B);
            const xadRatio = Number((Math.abs(A - D) / Math.abs(X - A)).toFixed(3));

            // console.log(`XAB Ratio: ${xabRatio}`);
            // console.log(`ABC Ratio: ${abcRatio}`);
            // console.log(`BCD Ratio: ${bcdRatio}`);
            // console.log(`XAD Ratio: ${xadRatio}`);

            const maxP1 = Math.max(X, A);
            const maxP2 = Math.max(C, D);
            const minP1 = Math.min(X, A);
            const minP2 = Math.min(C, D);

            const highPoint = Math.min(maxP1, maxP2);
            const lowPoint = Math.max(minP1, minP2);

            const side = dir == 1 ? 'Bullish' : 'Bearish';

            if (B < highPoint && B > lowPoint) {
                // gartley
                if (this.gartley && xabRatio >= 0.618 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 1.618 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax)) {
                    if (!this.detectCurrentBar || (this.detectCurrentBar && i + 4 == zigzags.length - 1)) {
                        console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] [${new Date(zigzags[i].t).toUTCString().split(" ")[4].split(" ")[0]}] ${this.interval} $${this.symbol} ${side} gartley detected 〽 | ${JSON.stringify({ xab: xabRatio, abc: abcRatio, bcd: bcdRatio, xad: xadRatio })}`));
                        if (this.detectCurrentBar) {
                            if (side == 'Bullish') {
                                const PD = X + (Math.abs(A - X) * (1 - 0.786));
                                const f27 = PD - (Math.abs(C - PD) * 0.272);
                                const p1618 = C + (Math.abs(C - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.272 * this.errMin && bcpdRatio <= 1.618 * this.errMax && xapdRatio >= 0.786 * this.errMin && xapdRatio <= 0.786 * this.errMax) {
                                    return { symbol: this.symbol, side: "Buy", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            } else {
                                const PD = X - (Math.abs(A - X) * (1 - 0.786));
                                const f27 = PD + (Math.abs(C - PD) * 0.272);
                                const p1618 = C - (Math.abs(C - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.272 * this.errMin && bcpdRatio <= 1.618 * this.errMax && xapdRatio >= 0.786 * this.errMin && xapdRatio <= 0.786 * this.errMax) {
                                    return { symbol: this.symbol, side: "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            }
                        }
                    }
                }
                // crab
                if (this.crab && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 2.24 * this.errMin && bcdRatio <= 3.618 * this.errMax && xadRatio >= 1.618 * this.errMin && xadRatio <= 1.618 * this.errMax)) {
                    if (!this.detectCurrentBar || (this.detectCurrentBar && i + 4 == zigzags.length - 1)) {
                        console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] [${new Date(zigzags[i].t).toUTCString().split(" ")[4].split(" ")[0]}] ${this.interval} $${this.symbol} ${side} crab detected 🦀 | ${JSON.stringify({ xab: xabRatio, abc: abcRatio, bcd: bcdRatio, xad: xadRatio })}`));
                        if (this.detectCurrentBar) {
                            if (side == 'Bullish') {
                                console.log(zigzag);
                                const PD = X - (Math.abs(A - X) * (1.618 - 1));
                                const f27 = PD - (Math.abs(C - PD) * 0.272);
                                const p1618 = C + (Math.abs(C - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 2.24 * this.errMin && bcpdRatio <= 3.618 * this.errMax && xapdRatio >= 1.618 * this.errMin && xapdRatio <= 1.618 * this.errMax) {
                                    return { symbol: this.symbol, side: dir == 1 ? "Buy" : "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            } else {
                                console.log(zigzag);
                                const PD = X + (Math.abs(A - X) * (1.618 - 1));
                                const f27 = PD + (Math.abs(C - PD) * 0.272);
                                const p1618 = C - (Math.abs(C - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 2.24 * this.errMin && bcpdRatio <= 3.618 * this.errMax && xapdRatio >= 1.618 * this.errMin && xapdRatio <= 1.618 * this.errMax) {
                                    return { symbol: this.symbol, side: dir == 1 ? "Buy" : "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            }
                        }
                    }
                }
                // bat
                if (this.bat && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.50 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 0.886 * this.errMax)) {
                    if (!this.detectCurrentBar || (this.detectCurrentBar && i + 4 == zigzags.length - 1)) {
                        console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] [${new Date(zigzags[i].t).toUTCString().split(" ")[4].split(" ")[0]}] ${this.interval} $${this.symbol} ${side} bat detected 🦇 | ${JSON.stringify({ xab: xabRatio, abc: abcRatio, bcd: bcdRatio, xad: xadRatio })}`));
                        if (this.detectCurrentBar) {
                            if (side == 'Bullish') {
                                console.log(zigzag);
                                const PD = X + (Math.abs(A - X) * (1 - 0.886));
                                const f50 = PD + (Math.abs(C - PD) * 0.50);
                                const f27 = PD - (Math.abs(C - PD) * 0.272);
                                const p27 = PD + (Math.abs(A - PD) * 1.272);
                                const p1618 = A + (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.618 * this.errMax && xapdRatio >= 0.886 * this.errMin && xapdRatio <= 0.886 * this.errMax) {
                                    return { symbol: this.symbol, side: "Buy", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            } else {
                                console.log(zigzag);
                                const PD = X - (Math.abs(A - X) * (1 - 0.886));
                                const f50 = PD - (Math.abs(C - PD) * 0.50);
                                const f27 = PD + (Math.abs(C - PD) * 0.272);
                                const p27 = PD - (Math.abs(A - PD) * 1.272);
                                const p1618 = A - (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.618 * this.errMax && xapdRatio >= 0.886 * this.errMin && xapdRatio <= 0.886 * this.errMax) {
                                    return { symbol: this.symbol, side: "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            }
                        }
                    }
                }
                // butterfly
                if (this.butterfly && xabRatio >= 0.786 * this.errMin && xabRatio <= 0.786 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 1.272 * this.errMin && xadRatio <= 1.618 * this.errMax)) {
                    if (!this.detectCurrentBar || (this.detectCurrentBar && i + 4 == zigzags.length - 1)) {
                        console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] [${new Date(zigzags[i].t).toUTCString().split(" ")[4].split(" ")[0]}] ${this.interval} $${this.symbol} ${side} butterfly detected 🦋 | ${JSON.stringify({ xab: xabRatio, abc: abcRatio, bcd: bcdRatio, xad: xadRatio })}`));
                        if (this.detectCurrentBar) {
                            if (side == 'Bullish') {
                                console.log(zigzag);
                                const a = 0.886 - 0.382; // 0.504
                                const b = (abcRatio < 0.382 ? 0.382 : abcRatio - 0.382) / (0.886 - 0.382); // 0 - 1
                                const c = 1.618 - 1.272; // 0.346
                                const d = 1.272 + (c * b);
                                const PD = X - (Math.abs(A - X) * (d - 1));
                                const f50 = PD + (Math.abs(C - PD) * 0.50);
                                const f27 = PD - (Math.abs(C - PD) * 0.272);
                                const p27 = PD + (Math.abs(A - PD) * 1.272);
                                const p1618 = A + (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.618 * this.errMax && xapdRatio >= 1.272 * this.errMin && xapdRatio <= 1.618 * this.errMax) {
                                    return { symbol: this.symbol, side: "Buy", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            } else {
                                console.log(zigzag);
                                const a = 0.886 - 0.382; // 0.504
                                const b = (abcRatio < 0.382 ? 0.382 : abcRatio - 0.382) / (0.886 - 0.382); // 0 - 1
                                const c = 1.618 - 1.272; // 0.346
                                const d = 1.272 + (c * b);
                                const PD = X + (Math.abs(A - X) * (d - 1));
                                const f50 = PD - (Math.abs(C - PD) * 0.50);
                                const f27 = PD + (Math.abs(C - PD) * 0.272);
                                const p27 = PD - (Math.abs(A - PD) * 1.272);
                                const p1618 = A - (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.618 * this.errMax && xapdRatio >= 1.272 * this.errMin && xapdRatio <= 1.618 * this.errMax) {
                                    return { symbol: this.symbol, side: "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            }
                        }
                    }
                }
                // shark
                if (this.shark && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.618 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.24 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 1.13 * this.errMax)) {
                    if (!this.detectCurrentBar || (this.detectCurrentBar && i + 4 == zigzags.length - 1)) {
                        console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] [${new Date(zigzags[i].t).toUTCString().split(" ")[4].split(" ")[0]}] ${this.interval} $${this.symbol} ${side} shark detected 🦈 | ${JSON.stringify({ xab: xabRatio, abc: abcRatio, bcd: bcdRatio, xad: xadRatio })}`));
                        if (this.detectCurrentBar) {
                            if (side == 'Bullish') {
                                console.log(zigzag);
                                const a = 1.618 - 1.13; // 0.488
                                const b = (abcRatio < 1.13 ? 1.13 : abcRatio - 1.13) / (1.618 - 1.13); // 0 - 1
                                const c = 1.13 - 0.886; // 0.244
                                const d = 0.886 + (c * b);
                                const PD = X - (Math.abs(A - X) * (d < 1 ? 1 - d : d - 1));
                                const f50 = PD + (Math.abs(C - PD) * 0.50);
                                const f27 = PD - (Math.abs(C - PD) * 0.272);
                                const p27 = PD + (Math.abs(A - PD) * 1.272);
                                const p1618 = A + (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.24 * this.errMax && xapdRatio >= 0.886 * this.errMin && xapdRatio <= 1.13 * this.errMax) {
                                    return { symbol: this.symbol, side: "Buy", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            } else {
                                console.log(zigzag);
                                const a = 1.618 - 1.13; // 0.488
                                const b = (abcRatio < 1.13 ? 1.13 : abcRatio - 1.13) / (1.618 - 1.13); // 0 - 1
                                const c = 1.13 - 0.886; // 0.244
                                const d = 0.886 + (c * b);
                                const PD = X + (Math.abs(A - X) * (d < 1 ? 1 - d : d - 1));
                                const f50 = PD - (Math.abs(C - PD) * 0.50);
                                const f27 = PD + (Math.abs(C - PD) * 0.272);
                                const p27 = PD - (Math.abs(A - PD) * 1.272);
                                const p1618 = A - (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.24 * this.errMax && xapdRatio >= 0.886 * this.errMin && xapdRatio <= 1.13 * this.errMax) {
                                    return { symbol: this.symbol, side: "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            }
                        }
                    }
                }
                // cypher
                if (this.cypher && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.414 * this.errMax && (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 2.00 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax)) {
                    if (!this.detectCurrentBar || (this.detectCurrentBar && i + 4 == zigzags.length - 1)) {
                        console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] [${new Date(zigzags[i].t).toUTCString().split(" ")[4].split(" ")[0]}] ${this.interval} $${this.symbol} ${side} cypher detected 🧮 | ${JSON.stringify({ xab: xabRatio, abc: abcRatio, bcd: bcdRatio, xad: xadRatio })}`));
                        if (this.detectCurrentBar) {
                            if (side == 'Bullish') {
                                console.log(zigzag);
                                const PD = X + (Math.abs(A - X) * (1 - 0.786));
                                const f50 = PD + (Math.abs(C - PD) * 0.50);
                                const f27 = PD - (Math.abs(C - PD) * 0.272);
                                const p27 = PD + (Math.abs(A - PD) * 1.272);
                                const p1618 = A + (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.272 * this.errMin && bcpdRatio <= 2.00 * this.errMax && xapdRatio >= 0.786 * this.errMin && xapdRatio <= 0.786 * this.errMax) {
                                    return { symbol: this.symbol, side: "Buy", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            } else {
                                console.log(zigzag);
                                const PD = X - (Math.abs(A - X) * (1 - 0.786));
                                const f50 = PD - (Math.abs(C - PD) * 0.50);
                                const f27 = PD + (Math.abs(C - PD) * 0.272);
                                const p27 = PD - (Math.abs(A - PD) * 1.272);
                                const p1618 = A - (Math.abs(A - PD) * 1.5);
                                const bcpdRatio = (C - PD) / (C - B);
                                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                                if (bcpdRatio >= 1.272 * this.errMin && bcpdRatio <= 2.00 * this.errMax && xapdRatio >= 0.786 * this.errMin && xapdRatio <= 0.786 * this.errMax) {
                                    return { symbol: this.symbol, side: "Sell", entryPrice: PD, stopLoss: f27, takeProfit: p1618 };
                                }
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    public getPattern = (zigzags: ZigZag[]): Pattern | null => {
        for (let i = 0; i < zigzags.length - 4; i++) {
            if (i + 4 != zigzags.length - 1) {
                continue; // skip to last zigzags
            }

            const zigzag = [zigzags[i], zigzags[i + 1], zigzags[i + 2], zigzags[i + 3], zigzags[i + 4]];
            const { X, A, B, C, D } = { X: zigzag[0].v, A: zigzag[1].v, B: zigzag[2].v, C: zigzag[3].v, D: zigzag[4].v };

            const direction = X > A ? -1 : 1

            const xabRatio = (A - B) / (A - X);
            const abcRatio = (B - C) / (B - A);
            const bcdRatio = (C - D) / (C - B);
            const xadRatio = Math.abs(A - D) / Math.abs(X - A);

            // bat
            if (this.bat && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.50 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 0.886 * this.errMax)) {
                const PD = direction ? X + (Math.abs(A - X) * (1 - 0.886)) : X - (Math.abs(A - X) * (1 - 0.886));
                const bcpdRatio = (C - PD) / (C - B);
                const xapdRatio = Math.abs(A - PD) / Math.abs(X - A);
                if ((bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.618 * this.errMax && xapdRatio >= 0.886 * this.errMin && xapdRatio <= 0.886 * this.errMax)) {
                    return { name: "Bat", X, A, B, C, D: PD, xabRatio, abcRatio, bcdRatio: bcpdRatio, xadRatio: xapdRatio, direction };
                }
            }

            // gartley
            if (this.gartley && xabRatio >= 0.618 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 1.618 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax)) {
                const PD = direction == 1 ? X + (Math.abs(A - X) * (1 - 0.786)) : X - (Math.abs(A - X) * (1 - 0.786));
                const bcpdRatio = Math.abs(C - PD) / Math.abs(C - B);
                const xapdRatio = Math.abs(A - PD) / Math.abs(X - A);
                if (bcpdRatio >= 1.272 * this.errMin && bcpdRatio <= 1.618 * this.errMax && xapdRatio >= 0.786 * this.errMin && xapdRatio <= 0.786 * this.errMax) {
                    return { name: "Gartley", X, A, B, C, D: PD, xabRatio, abcRatio, bcdRatio: bcpdRatio, xadRatio: xapdRatio, direction };
                }
            }

            // crab
            if (this.crab && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 2.24 * this.errMin && bcdRatio <= 3.618 * this.errMax && xadRatio >= 1.618 * this.errMin && xadRatio <= 1.618 * this.errMax)) {
                const PD = direction == 1 ? X - (Math.abs(A - X) * (1.618 - 1)) : X + (Math.abs(A - X) * (1.618 - 1));
                const bcpdRatio = (C - PD) / (C - B);
                const xapdRatio = Math.abs(A - PD) / Math.abs(X - A);
                if (bcpdRatio >= 2.24 * this.errMin && bcpdRatio <= 3.618 * this.errMax && xapdRatio >= 1.618 * this.errMin && xapdRatio <= 1.618 * this.errMax) {
                    return { name: "Crab", X, A, B, C, D: PD, xabRatio, abcRatio, bcdRatio: bcpdRatio, xadRatio: xapdRatio, direction };
                }
            }

            // butterfly
            if (this.butterfly && xabRatio >= 0.786 * this.errMin && xabRatio <= 0.786 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 1.272 * this.errMin && xadRatio <= 1.618 * this.errMax)) {
                const PD = direction == 1 ? X - (Math.abs(A - X) * (1.272 - 1)) : X + (Math.abs(A - X) * (1.272 - 1));
                const bcpdRatio = (C - PD) / (C - B);
                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.618 * this.errMax && xapdRatio >= 1.272 * this.errMin && xapdRatio <= 1.618 * this.errMax) {
                    return { name: "Butterfly", X, A, B, C, D: PD, xabRatio, abcRatio, bcdRatio: bcpdRatio, xadRatio: xapdRatio, direction };
                }
            }

            // shark
            // required > 1.618 for 0.886 otherwise 1.113
            if (this.shark && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.618 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.24 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 1.13 * this.errMax)) {
                const PD = direction == 1 ? X + (Math.abs(A - X) * (1 - 0.886)) : X - (Math.abs(A - X) * (1 - 0.886));
                const bcpdRatio = (C - PD) / (C - B);
                const xapdRatio = Number((Math.abs(A - PD) / Math.abs(X - A)).toFixed(3));
                if (bcpdRatio >= 1.618 * this.errMin && bcpdRatio <= 2.24 * this.errMax && xapdRatio >= 0.886 * this.errMin && xapdRatio <= 1.13 * this.errMax) {
                    return { name: "Shark", X, A, B, C, D: PD, xabRatio, abcRatio, bcdRatio: bcpdRatio, xadRatio: xapdRatio, direction };
                }
            }
        }
        return null;
    }

    // TODO: Update projection to use past 4 zigzag, calculate prev 3, check current zigzag valid
    public getProjection = (zigzags: ZigZag[]): Pattern | null => {
        for (let i = 0; i < zigzags.length - 3; i++) {
            if (i + 3 != zigzags.length - 1) {
                continue; // skip to last zigzags
            }

            const zigzag = [zigzags[i], zigzags[i + 1], zigzags[i + 2], zigzags[i + 3]];
            const { x, a, b, c } = { x: zigzag[0], a: zigzag[1], b: zigzag[2], c: zigzag[3] };
            const { X, A, B, C } = { X: zigzag[0].v, A: zigzag[1].v, B: zigzag[2].v, C: zigzag[3].v };

            const direction = X > A ? -1 : 1

            const xabRatio = (A - B) / (A - X);
            const abcRatio = (B - C) / (B - A);

            const mini = Math.min(x.i, a.i, b.i, c.i);
            const maxi = Math.max(x.i, a.i, b.i, c.i);
            const minv = Math.min(x.v, a.v, b.v, c.v);
            const maxv = Math.max(x.v, a.v, b.v, c.v);

            // TODO: Fix normalize func

            const di = maxi - mini;
            const dv = maxv - minv;

            // console.log([a.v, b.v, c.v]);
            // console.log([a.i, b.i, c.i]);

            const x1 = (a.v - minv) / (maxv - minv) * (maxi - mini);
            const x2 = (b.v - minv) / (maxv - minv) * (maxi - mini);
            const x3 = (c.v - minv) / (maxv - minv) * (maxi - mini);
            // console.log(`d=${di}`);
            // console.log([x1, x2, x3]);

            const lengthAB = Math.sqrt((b.i - a.i) ** 2 + (x2 - x1) ** 2);
            const lengthBC = Math.sqrt((c.i - b.i) ** 2 + (x3 - x2) ** 2);
            const lengthAC = Math.sqrt((c.i - a.i) ** 2 + (x3 - x1) ** 2);
            // console.log([lengthAB, lengthBC, lengthAC]);

            const cosAngleABC = (lengthAB ** 2 + lengthBC ** 2 - lengthAC ** 2) / (2 * lengthAB * lengthBC);
            // console.log(cosAngleABC);

            // Use the inverse cosine function to get the angle in radians
            const angleInRadians = Math.acos(cosAngleABC);
            // console.log(angleInRadians);

            // Convert the angle to degrees
            const abcDeg = (angleInRadians * 180) / Math.PI;
            // console.log(abcDeg);

            // bat
            // TODO: ideal BC projection = 1.618
            if (this.bat && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.50 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax) {
                const D = direction == 1 ? X + (Math.abs(A - X) * (1 - 0.886)) : X - (Math.abs(A - X) * (1 - 0.886));
                const bcdRatio = (C - D) / (C - B);
                const xadRatio = Math.abs(A - D) / Math.abs(X - A);
                if (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 0.886 * this.errMax) {
                    return { name: "Bat", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction };
                }
            }

            // crab
            // TODO: ideal BC projection = 3.618
            // TODO: don't alert crab until we break below/above X
            if (this.crab && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && abcDeg < 50) {
                const D = direction == 1 ? X - (Math.abs(A - X) * (1.618 - 1)) : X + (Math.abs(A - X) * (1.618 - 1));
                const bcdRatio = (C - D) / (C - B);
                const xadRatio = Math.abs(A - D) / Math.abs(X - A);
                if (bcdRatio >= 2.24 * this.errMin && bcdRatio <= 3.618 * this.errMax && xadRatio >= 1.618 * this.errMin && xadRatio <= 1.618 * this.errMax) {
                    return { name: "Crab", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction };
                }
            }

            // gartley
            if (this.gartley && xabRatio >= 0.618 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && abcDeg >= 50) {
                const D = direction == 1 ? X + (Math.abs(A - X) * (1 - 0.786)) : X - (Math.abs(A - X) * (1 - 0.786));
                const bcdRatio = (C - D) / (C - B);
                const xadRatio = Math.abs(A - D) / Math.abs(X - A);
                if (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 1.618 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax) {
                    return { name: "Gartley", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction };
                }
            }

            // butterfly
            if (this.butterfly && xabRatio >= 0.786 * this.errMin && xabRatio <= 0.786 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax) {
                const abcRatioNormalized = (abcRatio < 0.382 ? 0.382 : abcRatio - 0.382) / (0.886 - 0.382); // 0 - 1
                const xad = 1.272 + ((1.618 - 1.272) * abcRatioNormalized);
                const D = direction == 1 ? X - (Math.abs(A - X) * (xad - 1)) : X + (Math.abs(A - X) * (xad - 1));
                const bcdRatio = (C - D) / (C - B);
                const xadRatio = Math.abs(A - D) / Math.abs(X - A);
                if (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 1.272 * this.errMin && xadRatio <= 1.618 * this.errMax) {
                    return { name: "Butterfly", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction };
                }
            }

            // cypher
            if (this.cypher && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.414 * this.errMax) {
                const D = direction == 1 ? X + (Math.abs(A - X) * (1 - 0.786)) : X - (Math.abs(A - X) * (1 - 0.786));
                const bcdRatio = (C - D) / (C - B);
                const xadRatio = Math.abs(A - D) / Math.abs(X - A);
                if (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 2.00 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax) {
                    return { name: "Cypher", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction };
                }
            }

            // shark
            // TODO: don't alert crab until we break below/above 0.786
            if (this.shark && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.618 * this.errMax) {
                const a = 1.618 - 1.13; // 0.488
                const b = (abcRatio < 1.13 ? 1.13 : abcRatio - 1.13) / (1.618 - 1.13); // 0 - 1
                const d = 0.886 + ((1.13 - 0.886) * b);
                const D = direction == 1 ? X - (Math.abs(A - X) * (d < 1 ? 1 - d : d - 1)) : X + (Math.abs(A - X) * (d < 1 ? 1 - d : d - 1));
                const bcdRatio = (C - D) / (C - B);
                const xadRatio = Math.abs(A - D) / Math.abs(X - A);
                if (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.24 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 1.13 * this.errMax) {
                    return { name: "Shark", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction };
                }
            }
        }
        return null;
    }

    public getCounterPattern = (zigzags: ZigZag[], fib: Fibonacci): Pattern | null => {
        for (let i = 0; i < zigzags.length - 4; i++) {
            if (i + 4 != zigzags.length - 1) {
                continue; // skip to last 5 zigzag
            }

            // TODO: Remove E because recent price action (< 10 bars) does not have a zigzag line yet
            // TODO: Fix getZigZags function to return recent low/high as current zigzag low, this is useful for much of the application

            // const { X, A, B, C, D, E } = { X: zigzags[i].v, A: zigzags[i + 1].v, B: zigzags[i + 2].v, C: zigzags[i + 3].v, D: zigzags[i + 4].v, E: zigzags[i + 5].v };
            const { X, A, B, C, D, E } = { X: zigzags[i].v, A: zigzags[i + 1].v, B: zigzags[i + 2].v, C: zigzags[i + 3].v, D: zigzags[i + 4].v, E: -1 };

            const direction = X > A ? -1 : 1
            const fibLevel = direction == 1 ? (C - D) * fib + D : (D - C) * (1 - fib) + C;

            const xabRatio = (A - B) / (A - X);
            const abcRatio = (B - C) / (B - A);
            const bcdRatio = (C - D) / (C - B);
            const xadRatio = Math.abs(A - D) / Math.abs(X - A);

            // bat
            if (this.bat && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.50 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 0.886 * this.errMax)) {
                return { name: "Bat", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction, reversal: fibLevel };
                if ((direction == 1 && E <= fibLevel) || (direction == -1 && E >= fibLevel)) {
                }
            }

            // gartley
            if (this.gartley && xabRatio >= 0.618 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 1.618 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax)) {
                return { name: "Gartley", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction, reversal: fibLevel };
                if ((direction == 1 && E <= fibLevel) || (direction == -1 && E >= fibLevel)) {
                }
            }

            // TODO: crab unit tests
            if (this.crab && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 2.24 * this.errMin && bcdRatio <= 3.618 * this.errMax && xadRatio >= 1.618 * this.errMin && xadRatio <= 1.618 * this.errMax)) {
                return { name: "Crab", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction, reversal: fibLevel };
                if ((direction == 1 && E <= fibLevel) || (direction == -1 && E >= fibLevel)) {
                }
            }

            // TODO: butterfly unit tests
            if (this.butterfly && xabRatio >= 0.786 * this.errMin && xabRatio <= 0.786 * this.errMax && abcRatio >= 0.382 * this.errMin && abcRatio <= 0.886 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.618 * this.errMax && xadRatio >= 1.272 * this.errMin && xadRatio <= 1.618 * this.errMax)) {
                return { name: "Butterfly", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction, reversal: fibLevel };
                if ((direction == 1 && E <= fibLevel) || (direction == -1 && E >= fibLevel)) {
                }
            }

            // TODO: shark unit tests
            if (this.shark && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.618 * this.errMax && (bcdRatio >= 1.618 * this.errMin && bcdRatio <= 2.24 * this.errMax && xadRatio >= 0.886 * this.errMin && xadRatio <= 1.13 * this.errMax)) {
                return { name: "Shark", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction, reversal: fibLevel };
                if ((direction == 1 && E <= fibLevel) || (direction == -1 && E >= fibLevel)) {
                }
            }

            // TODO: cypher
            if (this.cypher && xabRatio >= 0.382 * this.errMin && xabRatio <= 0.618 * this.errMax && abcRatio >= 1.13 * this.errMin && abcRatio <= 1.414 * this.errMax && (bcdRatio >= 1.272 * this.errMin && bcdRatio <= 2.00 * this.errMax && xadRatio >= 0.786 * this.errMin && xadRatio <= 0.786 * this.errMax)) {
                return { name: "Cypher", X, A, B, C, D, xabRatio, abcRatio, bcdRatio, xadRatio, direction, reversal: fibLevel };
                if ((direction == 1 && E <= fibLevel) || (direction == -1 && E >= fibLevel)) {
                }
            }
        }
        return null;
    }

    public getTrade = (pattern: Pattern, sl: Fibonacci, tp: Fibonacci): Trade => {
        const { X, A, B, C, D } = { X: pattern.X, A: pattern.A, B: pattern.B, C: pattern.C, D: pattern.D };
        if (pattern.reversal) {
            const stopLoss = pattern.direction == 1 ? (pattern.reversal - D) * sl + D : D - (D - pattern.reversal) * sl;
            const takeProfit = pattern.direction == 1 ? (pattern.reversal - D) * tp + D : D - (D - pattern.reversal) * tp;
            return { symbol: this.symbol, side: pattern.direction == 1 ? "Sell" : "Buy", entryPrice: pattern.reversal, stopLoss, takeProfit, interval: this.interval };
        } else {
            if (["Gartley", "Shark"].includes(pattern.name)) {
                const stopLoss = pattern.direction == 1 ? C - (C - X) * sl : C + (X - C) * sl;
                const takeProfit = pattern.direction == 1 ? C - (C - X) * tp : C + (X - C) * tp;
                return { symbol: this.symbol, side: pattern.direction == 1 ? "Buy" : "Sell", entryPrice: D, stopLoss, takeProfit, interval: this.interval };
            } else {
                const stopLoss = pattern.direction == 1 ? C - (C - D) * sl : C + (D - C) * sl;
                const takeProfit = pattern.direction == 1 ? C - (C - D) * tp : C + (D - C) * tp;
                return { symbol: this.symbol, side: pattern.direction == 1 ? "Buy" : "Sell", entryPrice: D, stopLoss, takeProfit, interval: this.interval };
            }
        }
    }

    public scan = async (): Promise<Pattern | null> => {
        let candles = await getKlines({
            symbol: this.symbol,
            interval: this.interval,
            limit: 1440
        });
        switch (this.mode) {
            case "projections":
                return await this.getProjection((await this.getZigZags(candles)));
            case "reversals":
                return await this.getCounterPattern(await this.getZigZags(candles), 0.618);
            default:
                return await this.getPattern((await this.getZigZags(candles)));
        }
    }

    public run = async () => {
        const pattern = await this.scan();
        if (pattern) {
            const trade = this.getTrade(pattern, 1.272, -1.5);
            console.log(chalk.blueBright(`[${new Date().toLocaleTimeString()}] ${trade.interval} $${this.symbol} ${pattern.direction == 1 ? "Bullish" : "Bearish"} ${pattern.name} detected ▒ ${chalk.yellowBright(`${trade.side} Entry: ${trade.entryPrice}`)} ${chalk.redBright(`SL: ${trade.stopLoss}`)} ${chalk.greenBright(`TP: ${trade.takeProfit}`)}`));
            if (this.tradingEnabled) {
                return this.client.placeLimitOrder(trade.symbol, trade.side, String(trade.entryPrice), String(trade.takeProfit), String(trade.stopLoss));
            }
        }
    }
}

//     ████████╗ ██████╗ ██████╗  ██████╗ 
//    ╚══██╔══╝██╔═══██╗██╔══██╗██╔═══██╗
//       ██║   ██║   ██║██║  ██║██║   ██║
//       ██║   ██║   ██║██║  ██║██║   ██║
//       ██║   ╚██████╔╝██████╔╝╚██████╔╝
//       ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝ 
//                                   

// TODO: API key should use .env variable

// TODO: Adjust shark pattern SL to go below 1.272 extension. Don't want to get SL on 1.113 pullback.
// TODO: Adjust bat pattern SL to go below 1.272 extension. Don't want to get SL on 1.113 pullback.

// TODO: Get all open orders that are not TP or SL. Check if 3 or more open positions

// TODO: Calculate more accurate butterfly/crab patterns using angles

// TODO: Serialize trades with unique id to prevent re-detecting/re-entering the same trade
// [11:51:06 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:51:42 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:52:18 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:52:55 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:53:31 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:54:07 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:54:43 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:55:19 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:55:55 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:56:32 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:57:07 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:57:44 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:58:20 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:58:56 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [11:59:32 PM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [12:00:09 AM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953
// [12:00:45 AM] 1m $TRBUSDT Sell Gartley detected) | Entry: 88.509698 SL: 88.922783856 TP: 84.712953

// TODO: Long only / Short only mode

// TODO: Check if previous 5-10 candlestick wicks have touched PD, if so, not valid trade
// TODO: Discord alerts for 5min, 15min, 1h, 4h, 12h, D harmonic patterns

// TODO: Create Order tracking system (Closed trades + Orders placed) Use AWS database
// TODO: Serialize identified trades using candle open time + pattern name into UUID and store in DB to prevent duplicates

// TODO: Determine if Harmonic Pattern is 1 zigzag away. If so, place limit order retracement in opposite direction
// TODO: If trade is taking too long to go profit, close the trade
// TODO: Check order book activity for PD (D Projection) and locate front-run area
// TODO: If price is stalling (3-4 bars) at a valid D price, then market-limit into trade

export class BotRunner {
    private symbols = ["BTCUSDT", "ETHUSDT", "AAVEUSDT", "ADAUSDT", "ARBUSDT", "AVAXUSDT", "BCHUSDT", "BNBUSDT", "CYBERUSDT", "DOGEUSDT", "DOTUSDT", "HBARUSDT", "ICPUSDT", "INJUSDT", "LINKUSDT", "LPTUSDT", "LTCUSDT", "MATICUSDT", "QNTUSDT", "RUNEUSDT", "SOLUSDT", "TRBUSDT", "TRXUSDT", "UNFIUSDT", "XLMUSDT", "XMRUSDT", "XRPUSDT"];
    constructor() { }

    public scan = async (): Promise<void> => {
        printBotName();
        const mode: Mode = "normal";
        const manager = new TradeManager();
        const bots = [];
        for (let i = 0; i < this.symbols.length; i++) {
            bots.push(new WaveBot(this.symbols[i], "1m"));
            bots.push(new WaveBot(this.symbols[i], "5m"));
            bots.push(new WaveBot(this.symbols[i], "15m"));
            bots.push(new WaveBot(this.symbols[i], "1h"));
            bots.push(new WaveBot(this.symbols[i], "4h"));
            bots.push(new WaveBot(this.symbols[i], "12h"));
            bots.push(new WaveBot(this.symbols[i], "1d"));
            bots.push(new HarmonicBot(this.symbols[i], "1m", mode, manager));
            bots.push(new HarmonicBot(this.symbols[i], "5m", mode, manager));
            bots.push(new HarmonicBot(this.symbols[i], "15m", mode, manager));
            bots.push(new HarmonicBot(this.symbols[i], "1h", mode, manager));
            bots.push(new HarmonicBot(this.symbols[i], "4h", mode, manager));
            bots.push(new HarmonicBot(this.symbols[i], "12h", mode, manager));
            bots.push(new HarmonicBot(this.symbols[i], "1d", mode, manager));
        }
        while (true) {
            for (let i = 0; i < bots.length; i++) {
                await bots[i].run().catch(e => { console.log(e) });
            }
        }
    }

    public trade = async (): Promise<void> => {
        printBotName();
        const mode: Mode = "normal";
        const manager = new TradeManager();
        manager.manageTrades();
        manager.manageOrders();
        const bots = [];
        for (let i = 0; i < this.symbols.length; i++) {
            const bot = new HarmonicBot(this.symbols[i], "1m", mode, manager);
            bot.setPatterns({gartley: false, crab: false, bat: true, butterfly: false, shark: true, cypher: false});
            bots.push(bot);
        }
        for (let i = 0; i < bots.length; i++) {
            bots[i].setTradingEnabled(true);
        }
        while (true) {
            for (let i = 0; i < bots.length; i++) {
                await bots[i].run().catch(e => { console.log(e) });
            }
        }
    }
}
