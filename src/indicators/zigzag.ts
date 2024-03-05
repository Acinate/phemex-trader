import { KLine } from "../api/binance";

export interface ZigZag { s: string, v: number, i: number, t: number };

export const getZigZags = (kline: KLine[], length: number = 10): ZigZag[] => {
    let zigzags: ZigZag[] = [];
    let changed = false;
    let prevDir = 0;
    for (let i = kline.length - 1; i >= 0; i--) {
        let sh = kline[i];
        let sl = kline[i];
        for (let j = i; j > i - length && j > 0; j--) {
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
                    if (dir == 0 || last.v * dir > value * dir) {
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