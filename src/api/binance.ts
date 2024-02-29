import axios from "axios";
import { isFilteredSymbol } from "../utils";

const baseUrl = 'https://fapi.binance.com';

export type Interval = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "8h" | "12h" | "1d" | "3d" | "1w" | "1M";

export interface GetKlinesParams {
    symbol: string;
    interval: Interval;
    startTime?: number;
    endTime?: number;
    limit?: number;
}
export interface KLine {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
}
export const getKlines = async (params: GetKlinesParams, retry: number = 20): Promise<KLine[]> => {
    try {
        const queryString = Object.keys(params).map(k => `${k}=${(params as any)[k]}`).join("&");
        const url = `${baseUrl}/fapi/v1/klines?${queryString}`;
        const klines = (await axios.get(url, { timeout: 3000 })).data.map((kl: any[]) => {
            return {
                openTime: kl[0],
                open: Number(kl[1]),
                high: Number(kl[2]),
                low: Number(kl[3]),
                close: Number(kl[4]),
                volume: Number(kl[5]),
                closeTime: Number(kl[6]),
            }
        });
        return klines;
    } catch (e: any) {
        if (e.code == "ECONNABORTED") {
            retry = retry - 1;
            if (retry > 0) {
                return getKlines(params, retry);
            }
            console.log(`[ABORT] Failed to get kline data for: ${params.symbol}`);
        }
        console.log(e);
        throw Error(`[UNKNOWN AXIOS ERROR] getKlines()`);
    }
}

export const getSymbols = async () => {
    const url = `http://api.binance.com/api/v3/exchangeInfo`;
    const response = await axios.get(url);
    
    return response.data.symbols
        .map((t: any) => t.symbol)
        .filter((s: any) => !isFilteredSymbol(s));
}