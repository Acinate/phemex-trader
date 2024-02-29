import { v4 as uuidv4 } from 'uuid';
import { Interval, KLine, getKlines } from "../api/binance";
import { sleep } from "../utils";
import chalk from 'chalk';
import { TradeClient } from '../trade_client';

interface Level { 
    broken: boolean;
    ohlc: KLine;
}
// const timeMap: {[key: Interval]: number} = {
//     "1m": 60000,
    
// }
class SupportResistance {
    private symbol: string;
    private interval: Interval;
    private supportLevels: Level[];
    private resistanceLevels: Level[];
    private tradeClient: TradeClient;
    constructor(symbol: string, interval: Interval) {
    console.log(chalk.blue(
`
███████ ██████  ████████ ██████   █████  ██████  ███████ ██████  
██      ██   ██    ██    ██   ██ ██   ██ ██   ██ ██      ██   ██ 
███████ ██████     ██    ██████  ███████ ██   ██ █████   ██████  
     ██ ██   ██    ██    ██   ██ ██   ██ ██   ██ ██      ██   ██ 
███████ ██   ██    ██    ██   ██ ██   ██ ██████  ███████ ██   ██ 
`));

        this.symbol = symbol;
        this.interval = interval;
        this.supportLevels = [];
        this.resistanceLevels = [];
        this.tradeClient = new TradeClient();
    }

    public run = async () => {
        try {
            // getLevels
            await this.getLevels();
            // sleep for interval 0.5
            // scan price while sleeping
            await this.scanLevels();
        } catch (e: any) { 
            console.log(chalk.red(e.message));
        }

        this.run();
    }

    public getValueArea = async (): Promise<{POC: number, VAH: number, VAL: number, VAM: number}> => {
        let candles = await getKlines({
            symbol: this.symbol,
            interval: "1m",
            limit: 1440
        });

        // Find the first candle of the day, split the array to only contain todays session candles
        let sessionCandles: KLine[] = [];
        for (let i=0; i<candles.length; i++) {
            const date = new Date(candles[i].openTime).getUTCDate();
            const hour = new Date(candles[i].openTime).getUTCHours();
            const min = new Date(candles[i].openTime).getUTCMinutes();
            if (date == new Date().getUTCDate() && hour == 0 && min == 0) {
                sessionCandles = candles.slice(i);
                break;
            }
        }

        // TODO: If early in the day (1/4 of day), use prev day value area
        if (sessionCandles.length < 1440 / 4) {
            candles = await getKlines({
                symbol: this.symbol,
                interval: "5m",
                limit: 500
            });
            const yd = new Date((Date.now() - 1000 * 60 * 60 * 24));
            let startIndex = -1;
            let endIndex = -1;
            for (let i=0; i<candles.length; i++) {
                const date = new Date(candles[i].openTime).getUTCDate();
                const hour = new Date(candles[i].openTime).getUTCHours();
                const min = new Date(candles[i].openTime).getUTCMinutes();
                if (date == yd.getUTCDate() && hour == 0 && min == 0) {
                    startIndex = i;
                }
                if (date == new Date().getUTCDate() && hour == 0 && min == 0) {
                    endIndex = i-1;
                }
            }
            sessionCandles = candles.slice(startIndex, endIndex);
        }

        // Calculate profile interval y-axis (1000 profiles)
        let sessionHigh = Number(sessionCandles[0].high);
        let sessionLow = Number(sessionCandles[0].low);
        for (let i=0; i<sessionCandles.length; i++) {
            if (Number(sessionCandles[i].high) > sessionHigh) {
                sessionHigh = Number(sessionCandles[i].high);
            }
            if (Number(sessionCandles[i].low) < sessionLow) {
                sessionLow = Number(sessionCandles[i].low);
            }
        }

        const tick = ((sessionHigh - sessionLow) / 1000).toFixed(2);

        const volumeMap: {[key: string]: number} = {};
        for (let i=sessionHigh; i>=sessionLow; i-=Number(tick)) {
            volumeMap[i.toFixed(2)] = 0;
        }

        for (let i=0; i<sessionCandles.length; i++) {
            Object.keys(volumeMap).forEach(key => {
                if (Number(sessionCandles[i].high) >= Number(key) && Number(sessionCandles[i].low) <= Number(key)) {
                    // // @ts-ignore
                    // volumeMap[key] += Number(sessionCandles[i].volume); // VPO
                    // volumeMap[key] = Number(Number(volumeMap[key]).toFixed(2)); // VPO
                    volumeMap[key] += 1; // TPO
                }
            });
        }

        // Calculate POC
        const POC = Object.keys(volumeMap).reduce((a: string, b: string) => {
            return volumeMap[a] > volumeMap[b] ? a : b;
        });

        const totalVolume = Object.values(volumeMap).reduce((a: number, b: number) => a+b);
        const valueVolume = totalVolume * 0.70;

        // Group all rows above POC
        const volumeArray = Object.keys(volumeMap).map(k => { return {price: k, volume: volumeMap[k]} });
        const indexPoc = volumeArray.findIndex(a => a.price == POC);

        let workingVolume = volumeMap[POC];
        let topIndex = indexPoc;
        let botIndex = indexPoc;
        while (workingVolume < valueVolume) {
            if (topIndex <= 0) {
                workingVolume += volumeArray[botIndex+1].volume + volumeArray[botIndex+2].volume;
                botIndex+=2;
                continue;
            }
            if (botIndex >= volumeArray.length-1) {
                workingVolume += volumeArray[topIndex-1].volume + volumeArray[topIndex-2].volume;
                topIndex-=2;
                continue;
            }
            const topVolume = volumeArray[topIndex-1].volume + volumeArray[topIndex-2].volume;
            const botVolume = volumeArray[botIndex+1].volume + volumeArray[botIndex+2].volume;
            if (topVolume > botVolume) {
                workingVolume += topVolume;
                topIndex-=2;
            } else {
                workingVolume += botVolume;
                botIndex+=2;
            }
        }

        const VAH = Number(volumeArray[topIndex].price);
        const VAL = Number(volumeArray[botIndex].price);
        const VAM = Number((VAH - VAL) / 2 + VAL);

        console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] POC: ${POC}, VAH: ${VAH}, VAL: ${VAL}`));       

        return {
            POC: Number(POC), VAH, VAL, VAM
        }
    }

    private getLevels = async () => {
        const minLookback = 10;
        
        const candles = await getKlines({
            symbol: this.symbol,
            interval: this.interval,
            limit: 600
        });

        console.log(chalk.yellow(`--------------------------------------------------`));
        
        const valueArea = await this.getValueArea();

        const unbrokenHighs = [];
        // get unbroken highs
        for (let i=0; i<candles.length-1; i++) { // -3 to exclude first 3 candles
            let broken = false;
            for (let j=i+1; j<candles.length-2; j++) {
                if (candles[i].high < candles[j].high) {
                    broken = true;
                    break;
                }
            }
            unbrokenHighs.push({broken, ohlc: candles[i]});
        }
        // filter unbroken highs
        for (let i=unbrokenHighs.length-1; i>=0; i--) {
            if (!unbrokenHighs[i].broken) {
                if (unbrokenHighs[i].ohlc.high < valueArea.VAH) {
                    unbrokenHighs[i].broken = true;
                }
                for (let j=i-1; j>i-5 && j>=0; j--) {
                    if (!unbrokenHighs[j].broken) {
                        // TODO: check distance is also < 2ATR
                        unbrokenHighs[i].broken = true;
                    }
                }
            }
        }
        // print highs
        this.resistanceLevels = unbrokenHighs.slice(0, unbrokenHighs.length - minLookback).filter(rl => !rl.broken).sort((a, b) => {return b.ohlc.high - a.ohlc.high});
        this.resistanceLevels.forEach(c => {
            console.log(chalk.red(`[${new Date().toLocaleTimeString()}] RL: ${new Date(c.ohlc.openTime).toLocaleString()}: ${c.ohlc.high}`));
        });

        const unbrokenLows = [];
        // get unbroken lows
        for (let i=0; i<candles.length-1; i++) {
            let broken = false;
            for (let j=i+1; j<candles.length-2; j++) {
                if (candles[i].low > candles[j].low) {
                    broken = true;
                    break;
                }
            }
            unbrokenLows.push({broken, ohlc: candles[i]});
        }
        // filter unbroken lows
        for (let i=unbrokenLows.length-1; i>=0; i--) {
            if (!unbrokenLows[i].broken) {
                if (unbrokenLows[i].ohlc.low > valueArea.VAL) {
                    unbrokenLows[i].broken = true;
                }
                for (let j=i-1; j>i-5 && j>=0; j--) {
                    if (!unbrokenLows[j].broken) {
                        // TODO: check distance is also < 2ATR
                        unbrokenLows[i].broken = true;
                    }
                }
            }
        }

        // print lows
        this.supportLevels = unbrokenLows.slice(0, unbrokenLows.length - minLookback).filter(sl => !sl.broken).sort((a, b) => {return a.ohlc.low - b.ohlc.low});
        this.supportLevels.forEach(c => {
            console.log(chalk.green(`[${new Date().toLocaleTimeString()}] SL: ${new Date(c.ohlc.openTime).toLocaleString()}: ${c.ohlc.low}`));
        });

        try {
            const lastPrice = candles[candles.length-1].close;
            if (lastPrice > valueArea.VAM) {
                // If latest price is above, then enter short limit orders
                if (this.resistanceLevels[0]) {
                    const entryPrice = this.resistanceLevels[0].ohlc.high;
                    const takeProfit = valueArea.VAL;
                    const stopLoss = (Math.abs(Number(entryPrice) - Number(takeProfit)) / 3) + Number(entryPrice);
                    await this.tradeClient.placeLimitOrder("BTCUSDT", "Sell", entryPrice.toFixed(2), takeProfit.toFixed(2), stopLoss.toFixed(2));
                } else {
                    await this.tradeClient.manageOpenTrades();
                }
            } else {
                // If latest price is below, then enter long limit orders
                if (this.supportLevels[0]) {
                    const entryPrice = this.supportLevels[0].ohlc.low;
                    const takeProfit = valueArea.VAH;
                    const stopLoss = Number(entryPrice) - (Math.abs(Number(entryPrice) - Number(takeProfit)) / 3);
                    await this.tradeClient.placeLimitOrder("BTCUSDT", "Buy", entryPrice.toFixed(2), takeProfit.toFixed(2), stopLoss.toFixed(2));
                } else {
                    await this.tradeClient.manageOpenTrades();
                }
            }
        } catch (e: any) {
            console.log(chalk.red(`[${new Date().toLocaleTimeString()}] ${e.message}`));
        }
    }

    private scanLevels = async () => {
        const scanTime = Date.now();
        // TODO: Create map for time to ms
        let levelHit = false;
        while (!levelHit && Date.now() - scanTime < 1000 * 60) {
            const lastPrice = await getKlines({
                symbol: this.symbol,
                interval: this.interval,
                limit: 1
            });
            this.resistanceLevels.forEach(l => {
                if (!l.broken && l.ohlc.high < lastPrice[0].close) {
                    console.log(chalk.green(`[${new Date().toLocaleTimeString()}] RESISTANCE LEVEL HIT: ${new Date(l.ohlc.openTime)}: ${l.ohlc.high}`));
                    levelHit = true;
                }
            });
            this.supportLevels.forEach(l => {
                if (!l.broken && l.ohlc.low > lastPrice[0].close) {
                    console.log(chalk.green(`[${new Date().toLocaleTimeString()}] SUPPORT LEVEL HIT: ${new Date(l.ohlc.openTime)}: ${l.ohlc.high}`));
                    levelHit = true;
                }
            });
            await sleep(1000);
        }
    }

    private placeLimit = async () => {

        // Get account balance
        const balance = this.tradeClient.getAccountBalance();
        // Get entry point (RL / SL)
        const side = "Short";
        const entry = 34800;
        const takeProfit = 34300;
        const stopLoss = entry + (Math.abs(entry-takeProfit)/3);

        // Get take profit point (VAH / VAL)
        // Calculate stop loss (1:3 RR)
        // Calculate leverage
        // Place limit orders

        // check if orders already open
        // phemex.PlaceOrder({
        //     symbol: "BTCUSD",
        //     clOrdID: uuidv4(),
        //     side: "Buy",
        //     orderQty: 1
        // });
        // place limit order
        // place tp
        // place sl
    }

    private getOrders = async () => {

    }

    private websocket = async () => {
        throw Error('Not implemented');

        // TODO: Open websocket to get latest price
        // set this.latestPrice to current latest price
        // on each update from ws
    }
}

(async () => {
    const bot = new SupportResistance("BTCUSDT", "1m");
    await bot.run();
    // await bot.getValueArea();
})();