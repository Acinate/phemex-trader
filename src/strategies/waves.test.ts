import { WaveBot } from "./waves";
import candles from "./ARB_1_1.json";

const bot = new WaveBot("BTCUSDT", "1m");

test("gets valid wave 0.618 trade for bullish wave", async () => {
    const zigzags = [{"i": 0, "s": "H", "t": 1699818780000, "v": 1.1529}, {"i": 8, "s": "L", "t": 1699818780000, "v": 1.1438}, {"i": 20, "s": "H", "t": 1699819980000, "v": 1.1527}, {"i": 26, "s": "L", "t": 1699820340000, "v": 1.1466}, {"i": 52, "s": "H", "t": 1699821900000, "v": 1.1543}, {"i": 57, "s": "L", "t": 1699822200000, "v": 1.1494}];
    const trade = await bot.getTrade(zigzags, 1.1497, 0.618, 0.886, -1.5);
    expect(trade).toEqual({"entryPrice": 1.1495414000000002, "interval": "1m", "side": "Buy", "stopLoss": 1.1474778, "symbol": "BTCUSDT", "takeProfit": 1.1658500000000003});
});

test("gets valid wave 0.618 trade for bearish wave", async () => {
    const zigzags = [{"i": 0, "s": "L", "t": 1699805760000, "v": 1.1411}, {"i": 11, "s": "L", "t": 1699805760000, "v": 1.1492}, {"i": 36, "s": "L", "t": 1699807920000, "v": 1.1371}, {"i": 41, "s": "H", "t": 1699808220000, "v": 1.1433}, {"i": 48, "s": "L", "t": 1699808640000, "v": 1.1356}, {"i": 64, "s": "H", "t": 1699809600000, "v": 1.1406}, {"i": 77, "s": "L", "t": 1699810380000, "v": 1.1315}];
    const trade = await bot.getTrade(zigzags, 1.1397, 0.618, 0.886, -1.5);
    expect(trade).toEqual({"entryPrice": 1.1403586, "interval": "1m", "side": "Sell", "stopLoss": 1.1424222, "symbol": "BTCUSDT", "takeProfit": 1.12405});
});