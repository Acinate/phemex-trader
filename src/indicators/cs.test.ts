import { KLine } from "../api/binance"

describe('Detects bull hammer candles', () => {
    it('Detects bull hammer candle', () => {
        // SOL 24-1-18 8:30:00
        const kline: KLine = {
            open: 97.942,
            high: 98.046,
            low: 97.725,
            close: 97.907,
            volume: -1,
            openTime: -1,
            closeTime: -1
        }

    })
})