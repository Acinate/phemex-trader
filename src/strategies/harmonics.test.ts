import { HarmonicBot, Pattern } from "./harmonics";
import { TradeManager } from "./trade_client";
import candles from "../data/SOLUSDT_1699752480000_1699758420000.json";

const bot = new HarmonicBot("NULLUSDT", "1m", "normal", new TradeManager());

describe("get zigzags", () => {
    test("returns valid zigzags from kline array", () => {
        const zigzags = bot.getZigZags(candles);
        expect(zigzags).toEqual([{"i": 0, "s": "H", "t": 1699752480000, "v": 56.425}, {"i": 19, "s": "L", "t": 1699753620000, "v": 56.502}, {"i": 24, "s": "H", "t": 1699753920000, "v": 56.98}, {"i": 62, "s": "L", "t": 1699756200000, "v": 54.74}, {"i": 96, "s": "H", "t": 1699758240000, "v": 55.785}]);
    });
});

describe("gartley pattern", () => {
    describe('getPattern()', () => {
        test("returns valid projected bullish gartley using XABC zigzags", () => {
            const zigzags = [ // $ADA 15m 23-11-05 13:45 UTC
                { s: 'L', v: 0.3346, i: 0, t: 1699549500000 },
                { s: 'H', v: 0.3504, i: 15, t: 1699550580000 },
                { s: 'L', v: 0.3400, i: 32, t: 1699550820000 },
                { s: 'H', v: 0.3497, i: 46, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 0.3504, "B": 0.34, "C": 0.3497, "D": 0.3379812, "X": 0.3346, "abcRatio": 0.9326923076923095, "bcdRatio": 1.2081237113402108, "direction": 1, "name": "Gartley", "xabRatio": 0.6582278481012644, "xadRatio": 0.7860000000000015 });
        });
        test("returns valid projected bearish gartley using XABC zigzags", () => {
            const zigzags = [ // $ARB 15m 23-10-24 03:45 UTC
                { s: 'H', v: 0.9483, i: 0, t: 1699549500000 },
                { s: 'L', v: 0.8923, i: 15, t: 1699550580000 },
                { s: 'H', v: 0.9283, i: 28, t: 1699550820000 },
                { s: 'L', v: 0.9124, i: 35, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 0.8923, "B": 0.9283, "C": 0.9124, "D": 0.936316, "X": 0.9483, "abcRatio": 0.441666666666667, "bcdRatio": 1.504150943396227, "direction": -1, "name": "Gartley", "xabRatio": 0.6428571428571429, "xadRatio": 0.7860000000000003 });
        });
    });
    describe('getCounterPattern()', () => {
        test.skip("returns valid counter bullish gartley", () => {
            const zigzags = [ // $ADA 15m 23-11-05 13:45 UTC
                { s: 'L', v: 0.3346, i: 0, t: 1699549500000 },
                { s: 'H', v: 0.3504, i: 15, t: 1699550580000 },
                { s: 'L', v: 0.3400, i: 32, t: 1699550820000 },
                { s: 'H', v: 0.3497, i: 46, t: 1699551420000 },
                { s: 'H', v: 0.3370, i: 62, t: 1699551420000 },
                { s: 'H', v: 0.3426, i: 67, t: 1699551420000 },

            ];
            const pattern = bot.getCounterPattern(zigzags, 0.618);
            expect(pattern).toEqual({ "A": 0.3504, "B": 0.34, "C": 0.3497, "D": 0.337, "X": 0.3346, "abcRatio": 0.9326923076923095, "bcdRatio": 1.3092783505154646, "direction": 1, "name": "Gartley", "xabRatio": 0.6582278481012644, "xadRatio": 0.8481012658227838, "reversal": 0.3448486 });
        });
        test.skip("returns null for broken counter bullish gartley", () => {
            const zigzags = [ // $ADA 15m 23-11-05 13:45 UTC
                { s: 'L', v: 0.3346, i: 0, t: 1699549500000 },
                { s: 'H', v: 0.3504, i: 15, t: 1699550580000 },
                { s: 'L', v: 0.3400, i: 32, t: 1699550820000 },
                { s: 'H', v: 0.3497, i: 46, t: 1699551420000 },
                { s: 'H', v: 0.3370, i: 62, t: 1699551420000 },
                { s: 'H', v: 0.3458, i: 72, t: 1699551420000 }

            ];
            const pattern = bot.getCounterPattern(zigzags, 0.618);
            expect(pattern).toBeNull();
        });
        test.skip("returns valid counter bearish gartley", () => {
            const zigzags = [ // $AVAX 15m 23-11-10 03:00 UTC
                { s: 'H', v: 13.604, i: 0, t: 1699549500000 },
                { s: 'L', v: 13.025, i: 21, t: 1699550580000 },
                { s: 'H', v: 13.400, i: 32, t: 1699550820000 },
                { s: 'L', v: 13.139, i: 36, t: 1699551420000 },
                { s: 'L', v: 13.518, i: 41, t: 1699551420000 },
                { s: 'L', v: 13.316, i: 42, t: 1699551420000 }
            ];
            const pattern = bot.getCounterPattern(zigzags, 0.618);
            expect(pattern).toEqual({"A": 13.025, "B": 13.4, "C": 13.139, "D": 13.518, "X": 13.604, "abcRatio": 0.6960000000000027, "bcdRatio": 1.4521072796934862, "direction": -1, "name": "Gartley", "reversal": 13.283778, "xabRatio": 0.6476683937823847, "xadRatio": 0.8514680483592423});
        });
        test.skip("returns null for broken counter bearish gartley", () => {
            const zigzags = [ // $AVAX 15m 23-11-10 03:00 UTC
                { s: 'H', v: 13.604, i: 0, t: 1699549500000 },
                { s: 'L', v: 13.025, i: 21, t: 1699550580000 },
                { s: 'H', v: 13.400, i: 32, t: 1699550820000 },
                { s: 'L', v: 13.139, i: 36, t: 1699551420000 },
                { s: 'L', v: 13.518, i: 41, t: 1699551420000 },
                { s: 'L', v: 13.123, i: 43, t: 1699551420000 }
            ];
            const pattern = bot.getCounterPattern(zigzags, 0.618);
            expect(pattern).toBeNull();
        });
    }); 
    describe('getTrade()', () => {
        test("returns trade for bullish gartley pattern", () => {
            // $ARB 30m 23-11-06 05:30 UTC
            const pattern: Pattern = { A: 1.1458, B: 1.0952, C: 1.1305, D: 1.0809549999999999, X: 1.0633, abcRatio: 0.6976284584980261, bcdRatio: 1.4035410764872527, direction: 1, name: "Gartley", xabRatio: 0.613333333333333, xadRatio: 0.786 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 1.0809549999999999, "side": "Buy", "interval": "1m", "stopLoss": 1.0450215999999999, "symbol": "NULLUSDT", "takeProfit": 1.2313000000000003 });
        });
        test("returns trade for bearish gartley pattern", () => {
            const pattern: Pattern = { "A": 0.8923, "B": 0.9283, "C": 0.9124, "D": 0.936316, "X": 0.9483, "abcRatio": 0.441666666666667, "bcdRatio": 1.504150943396227, "direction": -1, "name": "Gartley", "xabRatio": 0.6428571428571429, "xadRatio": 0.786 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 0.936316, "side": "Sell", "interval": "1m", "stopLoss": 0.9580648, "symbol": "NULLUSDT", "takeProfit": 0.8585499999999999 });
        });
        test("returns trade for bullish counter gartley pattern", () => {
            const pattern: Pattern = { "A": 0.3504, "B": 0.34, "C": 0.3497, "D": 0.337, "X": 0.3346, "abcRatio": 0.9326923076923095, "bcdRatio": 1.3092783505154646, "direction": 1, "name": "Gartley", "xabRatio": 0.6582278481012644, "xadRatio": 0.8481012658227838, "reversal": 0.3448486 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({"entryPrice": 0.3448486, "interval": "1m", "side": "Sell", "stopLoss": 0.3469834192, "symbol": "NULLUSDT", "takeProfit": 0.32522710000000005});
        });
        test("returns trade for bearish counter gartley pattern", () => {
            const pattern: Pattern = {"A": 13.025, "B": 13.4, "C": 13.139, "D": 13.518, "X": 13.604, "abcRatio": 0.6960000000000027, "bcdRatio": 1.4521072796934862, "direction": -1, "name": "Gartley", "reversal": 13.283778, "xabRatio": 0.6476683937823847, "xadRatio": 0.8514680483592423};
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({"entryPrice": 13.283778, "interval": "1m", "side": "Buy", "stopLoss": 13.220069616, "symbol": "NULLUSDT", "takeProfit": 13.869333000000001});
        });
    });
});

describe("crab pattern", () => {
    describe("getPattern()", () => {
        // TODO: Find bullish crab example that doesn't overlap gartley
        test("returns valid bullish crab", () => {
            const zigzags = [ // $ICP 5m 23-11-03 04:45 UTC
                { s: 'x', v: 3.865, i: 0, t: 1699549500000 },
                { s: 'a', v: 3.974, i: 20, t: 1699550580000 },
                { s: 'b', v: 3.906, i: 39, t: 1699550820000 },
                { s: 'c', v: 3.958, i: 43, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 3.974, "B": 3.906, "C": 3.958, "D": 3.797638, "X": 3.865, "abcRatio": 0.7647058823529411, "bcdRatio": 3.0838846153846147, "direction": 1, "name": "Crab", "xabRatio": 0.6238532110091749, "xadRatio": 1.6180000000000014 });
        });
        // // TODO: Find bearish crab example that doesn't overlap bat (> 0.5 XAB)
        // test("returns valid bearish crab", () => {
        //     const zigzags = [ // $SOL 1m 23-11-09 22:17 UTC
        //         { s: 'H', v: 45.382, i: 1395, t: 1699549500000 },
        //         { s: 'L', v: 44.722, i: 1413, t: 1699550580000 },
        //         { s: 'H', v: 45.023, i: 1417, t: 1699550820000 },
        //         { s: 'L', v: 44.730, i: 1427, t: 1699551420000 }
        //     ];

        //     const pattern = bot.getPattern2(zigzags);
        //     expect(pattern).toEqual({ "A": 44.722, "B": 45.023, "C": 44.73, "D": 45.78988, "X": 45.382, "abcRatio": 0.9734219269103139, "bcdRatio": 3.6173378839589647, "direction": -1, "name": "Crab", "xabRatio": 0.45606060606061133, "xadRatio": 1.6180000000000012 });
        // });
    });
    describe("getTrade()", () => {
        test("returns trade for bullish crab pattern", () => {
            const pattern: Pattern = { "A": 3.974, "B": 3.906, "C": 3.958, "D": 3.797638, "X": 3.865, "abcRatio": 0.7647058823529411, "bcdRatio": 3.0838846153846147, "direction": 1, "name": "Crab", "xabRatio": 0.6238532110091749, "xadRatio": 1.6180000000000014 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 3.797638, "side": "Buy", "interval": "1m", "stopLoss": 3.754019536, "symbol": "NULLUSDT", "takeProfit": 4.198543000000001 });
        });
        // test("returns trade for bearish crab pattern", () => {
        //     const pattern: Pattern = { "A": 44.722, "B": 45.023, "C": 44.73, "D": 45.78988, "X": 45.382, "abcRatio": 0.9734219269103139, "bcdRatio": 3.6173378839589647, "direction": -1, "name": "Crab", "xabRatio": 0.45606060606061133, "xadRatio": 1.6180000000000012 };
        //     const trade = bot.getTrade(pattern, 1.272, -1.5);
        //     expect(trade).toEqual({"entryPrice": 45.78988, "side": "Buy", "stopLoss": 46.078167359999995, "symbol": "NULLUSDT", "takeProfit": 43.14018});
        // });
    });
});

describe("bat pattern", () => {
    describe("getPattern()", () => {
        test("returns valid bullish bat", () => {
            const zigzags = [ // $SOL 5m 23-11-08 17:35 UTC
                { s: 'L', v: 42.548, i: 0, t: 1699549500000 },
                { s: 'H', v: 43.654, i: 20, t: 1699550580000 },
                { s: 'L', v: 43.060, i: 28, t: 1699550820000 },
                { s: 'H', v: 43.371, i: 33, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 43.654, "B": 43.06, "C": 43.371, "D": 42.674084, "X": 42.548, "abcRatio": 0.5235690235690225, "bcdRatio": 2.24088745980708, "direction": 1, "name": "Bat", "xabRatio": 0.5370705244122969, "xadRatio": 0.8860000000000013 });
        });
        test("returns valid bearish bat", () => {
            const zigzags = [ // $SOL 5m 23-11-03 16:00 UTC
                { s: 'H', v: 40.100, i: 0, t: 1699549500000 },
                { s: 'L', v: 38.522, i: 27, t: 1699550580000 },
                { s: 'H', v: 39.352, i: 30, t: 1699550820000 },
                { s: 'L', v: 38.630, i: 39, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 38.522, "B": 39.352, "C": 38.63, "D": 39.920108, "X": 40.1, "abcRatio": 0.8698795180722839, "bcdRatio": 1.7868531855955774, "direction": -1, "name": "Bat", "xabRatio": 0.5259822560202768, "xadRatio": 0.8859999999999987 });
        });
    });
    describe("getTrade()", () => {
        test("returns trade for bullish bat pattern", () => {
            const pattern: Pattern = { "A": 43.654, "B": 43.06, "C": 43.371, "D": 42.674084, "X": 42.548, "abcRatio": 0.5235690235690225, "bcdRatio": 2.24088745980708, "direction": 1, "name": "Bat", "xabRatio": 0.5370705244122969, "xadRatio": 0.886 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 42.674084, "side": "Buy", "interval": "1m", "stopLoss": 42.484522848, "symbol": "NULLUSDT", "takeProfit": 44.416374000000005 });
        });
        test("returns trade for bearish bat pattern", () => {
            const pattern: Pattern = { "A": 38.522, "B": 39.352, "C": 38.63, "D": 39.920108, "X": 40.1, "abcRatio": 0.8698795180722839, "bcdRatio": 1.7868531855955774, "direction": -1, "name": "Bat", "xabRatio": 0.5259822560202768, "xadRatio": 0.886 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 39.920108, "side": "Sell", "interval": "1m", "stopLoss": 40.271017375999996, "symbol": "NULLUSDT", "takeProfit": 36.694838000000004 });
        });
    });
});

describe("butterfly pattern", () => {
    describe("getPattern()", () => {
        test("returns valid bullish butterfly", () => {
            const zigzags = [
                { s: 'L', v: 39.004, i: 0, t: 1699549500000 },
                { s: 'H', v: 40.315, i: 9, t: 1699550580000 },
                { s: 'L', v: 39.281, i: 22, t: 1699550820000 },
                { s: 'H', v: 40.100, i: 28, t: 1699551420000 },
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 40.315, "B": 39.281, "C": 40.1, "D": 38.278340448973005, "X": 39.004, "abcRatio": 0.7920696324951678, "bcdRatio": 2.224248536052492, "direction": 1, "name": "Butterfly", "xabRatio": 0.788710907704042, "xadRatio": 1.5535160572288278 });
        });
        test("returns valid bearish butterfly", () => {
            const zigzags = [ // $SOL 5m 23-10-31 1:50 UTC
                { s: 'H', v: 36.480, i: 0, t: 1699549500000 },
                { s: 'L', v: 35.558, i: 27, t: 1699550580000 },
                { s: 'H', v: 36.260, i: 32, t: 1699550820000 },
                { s: 'L', v: 35.800, i: 39, t: 1699551420000 },
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 35.558, "B": 36.26, "C": 35.8, "D": 36.9037534807127, "X": 36.48, "abcRatio": 0.6552706552706582, "bcdRatio": 2.399464088505875, "direction": -1, "name": "Butterfly", "xabRatio": 0.7613882863340569, "xadRatio": 1.4596024736580326 });
        });
    });
    describe("getTrade()", () => {
        test("returns trade for bullish butterfly pattern", () => {
            const pattern: Pattern = { "A": 40.315, "B": 39.281, "C": 40.1, "D": 38.278340448973005, "X": 39.004, "abcRatio": 0.7920696324951678, "bcdRatio": 2.224248536052492, "direction": 1, "name": "Butterfly", "xabRatio": 0.788710907704042, "xadRatio": 1.554 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 38.278340448973005, "side": "Buy", "interval": "1m", "stopLoss": 37.78284905109366, "symbol": "NULLUSDT", "takeProfit": 42.8324893265405 });
        });
        test("returns trade for bearish butterfly pattern", () => {
            const pattern: Pattern = { "A": 35.558, "B": 36.26, "C": 35.8, "D": 36.9037534807127, "X": 36.48, "abcRatio": 0.6552706552706582, "bcdRatio": 2.399464088505875, "direction": -1, "name": "Butterfly", "xabRatio": 0.7613882863340569, "xadRatio": 1.46 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 36.9037534807127, "side": "Sell", "interval": "1m", "stopLoss": 37.203974427466555, "symbol": "NULLUSDT", "takeProfit": 34.14436977893094 });
        });
    });
});

describe('shark pattern', () => {
    describe("getPattern()", () => {
        // // TODO: Find shark example that doesn't overlay with cypher
        // test("returns valid bullish shark", () => {
        //     const zigzags = [ // $RUNE 30m 23-08-31 18:00
        //         { s: 'L', v: 1.455, i: 0, t: 1699549500000 },
        //         { s: 'H', v: 1.597, i: 33, t: 1699550580000 },
        //         { s: 'L', v: 1.528, i: 48, t: 1699550820000 },
        //         { s: 'H', v: 1.615, i: 86, t: 1699551420000 },
        //     ];
        //     const pattern = bot.getPattern2(zigzags);
        //     expect(pattern).toEqual({ "A": 1.597, "B": 1.528, "C": 1.615, "D": 1.448103739130435, "X": 1.455, "abcRatio": 1.2608695652173918, "bcdRatio": 1.9183478260869546, "direction": 1, "name": "Shark", "xabRatio": 0.48591549295774644, "xadRatio": 1.0485652173913034 });
        // });
        // // TODO: Find shark example that doesn't overlay with cypher
        // test("returns valid bearish shark", () => {
        //     const zigzags = [ // $RUNE 5m 23-10-25 14:20
        //         { s: 'H', v: 2.246, i: 0, t: 1699549500000 },
        //         { s: 'L', v: 2.194, i: 12, t: 1699550580000 },
        //         { s: 'H', v: 2.221, i: 19, t: 1699550820000 },
        //         { s: 'L', v: 2.186, i: 22, t: 1699551420000 },
        //     ];
        //     const pattern = bot.getPattern2(zigzags);
        //     expect(pattern).toEqual({ "A": 2.194, "B": 2.221, "C": 2.186, "D": 2.2476042962962963, "X": 2.246, "abcRatio": 1.2962962962962952, "bcdRatio": 1.7601227513227466, "direction": -1, "name": "Shark", "xabRatio": 0.5192307692307714, "xadRatio": 1.0308518518518524 });
        // });
    });
    describe("getTrade()", () => {
        test("returns trade for bullish shark", () => {
            const pattern: Pattern = { "A": 1.597, "B": 1.528, "C": 1.615, "D": 1.448103739130435, "X": 1.455, "abcRatio": 1.2608695652173918, "bcdRatio": 1.9183478260869546, "direction": 1, "name": "Shark", "xabRatio": 0.48591549295774644, "xadRatio": 1.049 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 1.448103739130435, "side": "Buy", "interval": "1m", "stopLoss": 1.41148, "symbol": "NULLUSDT", "takeProfit": 1.855 });
        });
        test("returns trade for bearish shark", () => {
            const pattern: Pattern = { "A": 2.194, "B": 2.221, "C": 2.186, "D": 2.2476042962962963, "X": 2.246, "abcRatio": 1.2962962962962952, "bcdRatio": 1.7601227513227466, "direction": -1, "name": "Shark", "xabRatio": 0.5192307692307714, "xadRatio": 1.031 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({ "entryPrice": 2.2476042962962963, "side": "Sell", "interval": "1m", "stopLoss": 2.26232, "symbol": "NULLUSDT", "takeProfit": 2.096 });
        });
    });
});

describe("cypher pattern", () => {
    describe("getPattern", () => {
        test("returns valid bullish cypher", () => {
            const zigzags = [ // $INJ 1h 23-11-01 6:00 UTC
                { s: 'L', v: 13.443, i: 0, t: 1699549500000 },
                { s: 'H', v: 15.613, i: 12, t: 1699550580000 },
                { s: 'L', v: 14.460, i: 24, t: 1699550820000 },
                { s: 'H', v: 15.860, i: 27, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 15.613, "B": 14.46, "C": 15.86, "D": 13.90738, "X": 13.443, "abcRatio": 1.2142237640936688, "bcdRatio": 1.3947285714285726, "direction": 1, "name": "Cypher", "xabRatio": 0.5313364055299533, "xadRatio": 0.7859999999999999 });
        });
        test("returns valid bearish cypher", () => {
            const zigzags = [ // $INJ 1h 23-11-01 6:00 UTC
                { s: 'L', v: 0.04951, i: 0, t: 1699549500000 },
                { s: 'H', v: 0.04831, i: 12, t: 1699550580000 },
                { s: 'L', v: 0.04875, i: 20, t: 1699550820000 },
                { s: 'H', v: 0.04829, i: 24, t: 1699551420000 }
            ];
            const pattern = bot.getProjection(zigzags);
            expect(pattern).toEqual({ "A": 0.04831, "B": 0.04875, "C": 0.04829, "D": 0.0492532, "X": 0.04951, "abcRatio": 1.0454545454545432, "bcdRatio": 2.0939130434782456, "direction": -1, "name": "Cypher", "xabRatio": 0.3666666666666692, "xadRatio": 0.7859999999999987 });
        });
    });
    describe("getTrade()", () => {
        test("returns trade for bullish cypher", () => {
            const pattern: Pattern = { "A": 15.613, "B": 14.46, "C": 15.86, "D": 13.90738, "X": 13.443, "abcRatio": 1.2142237640936688, "bcdRatio": 1.3947285714285726, "direction": 1, "name": "Cypher", "xabRatio": 0.5313364055299533, "xadRatio": 0.7859999999999999 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({"entryPrice": 13.90738, "side": "Buy", "interval": "1m", "stopLoss": 13.37626736, "symbol": "NULLUSDT", "takeProfit": 18.78893});
        });
        test("returns trade for bearish cypher", () => {
            const pattern: Pattern = { "A": 0.04831, "B": 0.04875, "C": 0.04829, "D": 0.0492532, "X": 0.04951, "abcRatio": 1.0454545454545432, "bcdRatio": 2.0939130434782456, "direction": -1, "name": "Cypher", "xabRatio": 0.3666666666666692, "xadRatio": 0.7859999999999987 };
            const trade = bot.getTrade(pattern, 1.272, -1.5);
            expect(trade).toEqual({"entryPrice": 0.0492532, "side": "Sell", "interval": "1m", "stopLoss": 0.0495151904, "symbol": "NULLUSDT", "takeProfit": 0.046845200000000004});
        });
    });
});