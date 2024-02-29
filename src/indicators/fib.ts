export type Retracement = "e0618" | "e0272" | "r0000" | "r0113" | "r0236" | "r0382" | "r0500" | "r0618" | "r0700" | "r0786" | "r0886" | "r1000" | "r1113" | "r1272";
export interface Retracements { e0618: number; e0272: number; r0000: number; r0113: number; r0236: number; r0382: number; r0500: number; r0618: number; r0700: number; r0786: number; r0886: number; r1000: number; r1113: number; r1272: number; }
export const getRetracements = (p1: number, p2: number): Retracements => {
    if (p1 > p2) {
        const h = p1 - p2;
        return {
            r1272: p1 + h * 0.272,
            r1113: p1 + h * 0.113,
            r1000: p1,
            r0886: p2 + h * 0.886,
            r0786: p2 + h * 0.786,
            r0700: p2 + h * 0.700,
            r0618: p2 + h * 0.590,
            // r0618: p2 + h * 0.618,
            r0500: p2 + h * 0.480,
            // r0500: p2 + h * 0.500,
            r0382: p2 + h * 0.365,
            // r0382: p2 + h * 0.382,
            r0236: p2 + h * 0.236,
            r0113: p2 + h * 0.113,
            r0000: p2,
            e0272: p2 - h * 0.272,
            e0618: p2 - h * 0.618,
        }
    } else {
        const h = p2 - p1;
        return {
            e0618: p2 + h * 0.618,
            e0272: p2 + h * 0.272,
            r0000: p2,
            r0113: p2 - h * 0.113,
            r0236: p2 - h * 0.236,
            r0382: p2 - h * 0.365,
            // r0382: p2 - h * 0.382,
            r0500: p2 - h * 0.480,
            // r0500: p2 - h * 0.500,
            r0618: p2 - h * 0.590,
            // r0618: p2 - h * 0.618,
            r0700: p2 - h * 0.700,
            r0786: p2 - h * 0.786,
            r0886: p2 - h * 0.886,
            r1000: p1,
            r1113: p1 - (h * 0.113),
            r1272: p1 - (h * 0.272),
        }
    }
}