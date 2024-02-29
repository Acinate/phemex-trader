// TODO: GET KLINE DATA
// TODO: GET ZIG ZAG ARRAY
// TODO: CALCULATE RETRACEMENTS
// TODO: GET ACCOUNT BALANCE
// TODO: GET ACCOUNT POSITIONS
// TODO: IF NO POSITION PLACE LIMIT ORDERS
// TODO: IF POSITIONS, LOG POSITIONS

import chalk from "chalk";
import { Interval, getKlines } from "../api/binance"
import { CancelAllOrders, PlaceOrder, QueryAccountPositions, QueryOpenOrdersBySymbol, QueryProductInformation } from "../api/phemex";
import { sleep } from "../utils";
import { Retracement, Retracements, getRetracements } from "../indicators/fib";
import { getZigZags } from "../indicators/zigzag"

export class FibTrader {
    private side: "Buy" | "Sell" = "Buy";
    private retracements: Retracements | undefined;
    private symbol;
    private risk;
    private decimals: number | undefined;

    private entry: number | undefined;
    private stopLoss: number | undefined;
    private takeProfit: number | undefined;

    private interval;
    constructor(symbol: string, side: "Buy" | "Sell", interval: Interval, risk: number) {
        this.symbol = symbol;
        this.side = side;
        this.interval = interval;
        this.risk = risk;
    }

    private initialize = async () => {
        this.decimals = ((await QueryProductInformation())?.data?.perpProductsV2.filter((p: any) => p.symbol == this.symbol)[0]).pricePrecision;
    }

    private getIndicators = async () => {
        await getKlines({ symbol: this.symbol, interval: this.interval }).then(kline => {
            const zigzag = getZigZags(kline, 5);
            console.log(zigzag.map(zz => { return { ...zz, t: new Date(zz.t).toLocaleTimeString() } }));
            let p1 = zigzag[zigzag.length - 2].v;
            let p2 = zigzag[zigzag.length - 1].v;
            if (this.side == "Buy") {
                console.log('Calc BUY retracements');
                if (p1 > p2) {
                    console.log('Using previous leg');
                    p1 = zigzag[zigzag.length - 3].v;
                    p2 = zigzag[zigzag.length - 2].v;
                }
            } else { // ELSE IF SELL
                console.log('Calc SELL retracements');
                if (p1 < p2) {
                    console.log('Using previous leg');
                    p1 = zigzag[zigzag.length - 3].v;
                    p2 = zigzag[zigzag.length - 2].v;
                }
            }
            console.log(`P1: ${p1}`);
            console.log(`P2: ${p2}`);
            const retracements = getRetracements(p1, p2);
            console.log(retracements);
            this.retracements = retracements;
            this.entry = Number(this.retracements.r0618);
            this.takeProfit = Number(this.retracements.e0272.toFixed(this.decimals));
            this.stopLoss = Number(this.retracements.r1113.toFixed(this.decimals));
        })
    }

    private placeLimitOrder = async (retracement: Retracement, quantity: number) => {
        if (this.retracements == undefined) return;

        // const quantity = '5'; // TODO: Calculate

        const placeOrder = await PlaceOrder({
            symbol: this.symbol,
            side: this.side,
            posSide: this.side == "Buy" ? "Long" : "Short",
            orderQtyRq: `${quantity}`,
            ordType: "Limit",
            priceRp: this.retracements[`${retracement}`].toFixed(this.decimals),
            takeProfitRp: Number(this.takeProfit).toFixed(this.decimals),
            // stopLossRp: Number(this.stopLoss).toFixed(this.decimals)
            stopLossRp: undefined
        });

        if (placeOrder.data?.ordStatus == "Created") {
            console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] Successfully placed order: ${placeOrder.data?.orderID}`));
            // this.manager.addOrder({ symbol: symbol, orderId: placeOrder.data?.orderID });
        } else {
            console.log(chalk.red(`[${new Date().toLocaleTimeString()}] Error creating order for ${this.symbol}: ${placeOrder.msg}`));
        }
    }

    private updateLimitOrder = async () => {
        const openOrders = (await QueryOpenOrdersBySymbol({ symbol: this.symbol }))?.data?.rows;
        console.log('checking if limit order needs update');
        // if (openOrder && (openOrder.priceRp != `${this.entry}` || openOrder.takeProfitRp != `${this.takeProfit}` || openOrder.stopLossRp != `${this.stopLoss}`) ) {

        const positions = (await QueryAccountPositions({ currency: "USDT" }))?.data?.positions.filter((p: any) => p.side != "None");
        console.log(positions);


        const solBalance = positions.size;
        let updateOrders = [false, false, false];

        const o382 = openOrders?.find(o => o.priceRp == `${this.retracements?.r0382}`);
        if (o382 == null && solBalance < 0.75) {
            updateOrders[0] = true;
        }
        const o500 = openOrders?.find(o => o.priceRp == `${this.retracements?.r0500}`);
        if (o500 == null && solBalance < 2.25) {
            updateOrders[1] = true;
        }
        const o618 = openOrders?.find(o => o.priceRp == `${this.retracements?.r0618}`);
        if (o618 == null && solBalance < 5) {
            updateOrders[2] = true;
        }

        // return;

        if (updateOrders.includes(true)) {
            console.log('updating limit orders');
            await CancelAllOrders({ symbol: this.symbol });
            if (updateOrders[0]) await this.placeLimitOrder('r0382', 0.75);
            if (updateOrders[1]) await this.placeLimitOrder('r0500', 1.50);
            if (updateOrders[2]) await this.placeLimitOrder('r0618', 3.75);
        }
    }

    public run = async () => {
        await this.initialize();
        // while (true) {
        await this.getIndicators();

        // const res = await QueryAccountPositions({ currency: "USDT" });
        // console.log(res);

        // Get account balance
        console.log(await QueryAccountPositions({ currency: "USDT" }));
        const balance = (await QueryAccountPositions({ currency: "USDT" }))?.data?.account?.accountBalanceRv;
        console.log(`balance: ${balance}`);
        // Get account positions
        const positions = (await QueryAccountPositions({ currency: "USDT" }))?.data?.positions.filter((p: any) => p.side != "None");
        console.log(`positions: ${positions}`);

        const entry = this.retracements?.r0618;
        const stop = this.retracements?.r1000;

        if (entry == null || stop == null) throw Error('entry/stop is null');

        const distance = Math.abs(entry - stop);
        const size = balance * this.risk / distance;

        if (true || positions.length <= 0) {
            // If no open orders, place limit order
            const openOrders = (await QueryOpenOrdersBySymbol({ symbol: this.symbol }))?.data?.rows;
            console.log(`open orders: ${openOrders}`);
            if (openOrders == undefined) {
                // Place limit orders
                await this.placeLimitOrder('r0382', size / 3);
                await this.placeLimitOrder('r0500', size / 3);
                await this.placeLimitOrder('r0618', size / 3);
            } else {
                // If open orders, update limit order
                // await this.updateLimitOrder();
            }
        } else {
            // Manage trade
        }

        await sleep(1000);
        // }
    }
}

(async () => {

    // risk = 0.10
    // risk from 0.618 - 1.00 = 10%

    // pos size at 0.618 = price618 - price100 = distance
    // or pos size at 0.500 = price500 - price100 = distance

    // distance = price618 - price100
    // risk = balance * 0.10
    // size = distance / risk
    // qty618 = size * 0.33
    // qty500 = size * 0.33
    // qty382 = size * 0.33

    const client = new FibTrader("SOLUSDT", "Buy", "1d", 0.10);
    await client.run().catch(e => { console.log(e); });
        await sleep(500);
})();