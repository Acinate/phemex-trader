import chalk from 'chalk';
import * as Phemex from '../api/phemex';
import { sleep } from '../util/util';
import { Database } from '../data/database';

// TODO: Binance API and Phemex API have different KLine values
// To get accurate OHLC data using Binance and entering on Phemex
// We can get the Binance OHLC timestamp and lookup Phemex candle based on timestamp

// TODO: Change to 1:5 RR ratio

// TODO: Establish websocket connections on startup
// Populate object with current state of account
// On ws messages, update object state to reduce # of rest calls

export class TradeClient {
    private manager: TradeManager;
    private database: Database;

    // private riskPerTrade = 0.05;
    private riskPerTrade = 3;
    private leverage = 20;

    constructor(manager: TradeManager) {
        this.manager = manager;
        this.database = new Database();
    }

    public getProductInformation = async (symbol: string) => {
        let productInformation = this.database.getProductInformation(symbol);
        if (productInformation == null) {
            productInformation = (await Phemex.QueryProductInformation())?.data?.perpProductsV2.filter((p: any) => p.symbol == symbol)[0];
            if (productInformation != null) {
                this.database.setProductInformation(symbol, productInformation);
            }
        }
        return productInformation;
    }

    public getLatestPrice = async (symbol: string) => {
        return (await Phemex.Query24Ticker({ symbol: symbol }))?.result?.closeRp;
    }

    public getAccountBalance = async () => {
        return (await Phemex.QueryAccountPositions({ currency: "USDT" }))?.data?.account?.accountBalanceRv;
    }

    public getOpenOrders = async (symbol: string) => {
        return (await Phemex.QueryOpenOrdersBySymbol({ symbol: symbol }));
    }

    public getClosedOrders = async () => {
        return (await Phemex.QueryClosedOrdersBySymbol({ currency: "USDT", start: Math.floor((Date.now() - (1000 * 60 * 60 * 4)) / 1000) }));
    }

    public getOpenPositions = async () => {
        return (await Phemex.QueryAccountPositions({ currency: "USDT" }))?.data?.positions.filter((p: any) => p.side != "None");
    }

    public getOrdersHistory = async (symbol: string) => {
        return (await Phemex.QueryOrdersHistory({ symbol: symbol }));
    }

    public getTradesHistory = async (symbol: string) => {
        return (await Phemex.QueryTradesHistory({ symbol: symbol }));
    }

    public amendOrderById = async (symbol: string, clOrdID: string, priceRp: string) => {
        // @ts-ignore
        return (await Phemex.AmendOrderById({ symbol: symbol, origClOrdID: clOrdID, priceRp: priceRp }));
    }

    public cancelSingleOrderById = async (id: string, side: "Buy" | "Sell", symbol: string) => {
        return (await Phemex.CancelSingleOrderById({ orderID: id, posSide: side, symbol: symbol }));
    }

    public cancelAllOrderForSymbol = async (symbol: string) => {
        return (await Phemex.CancelAllOrders({ symbol: symbol }));
    }

    // TODO: Broken (invalid signature, can probably be fixed by switching order of params)
    public setLeverage = async (symbol: string, leverage: string) => {
        return (await Phemex.SetLeverage({ symbol: symbol, longLeverageRr: leverage, shortLeverageRr: leverage }))
    }

    public placeLimitOrder = async (symbol: string, side: "Buy" | "Sell", entry: string, takeProfit: string, stopLoss: string): Promise<void> => {
        // TODO: Check distance between entryPrice and stopLoss and ensure > 3 ATR (or something similar)
        const productInfo = await this.getProductInformation(symbol);
        entry = Number(entry).toFixed(productInfo.pricePrecision);
        takeProfit = Number(takeProfit).toFixed(productInfo.pricePrecision);
        stopLoss = Number(stopLoss).toFixed(productInfo.pricePrecision);

        // // check if last trade was a loss
        // const lastTrade = (await this.getTradesHistory(symbol))?.data?.rows.filter(t=>t.closedPnlRv!='0')[0];
        // if (lastTrade && Number(lastTrade.closedPnlRv) < 0) {
        //     if (Date.now() - (lastTrade.transactTimeNs / 1000000) < 1000 * 60 * 10) {
        //         throw Error('Cannot place limit order: last trade was loss');
        //     }
        // }

        // // check if last trade was a win & same price
        // // if (lastTrade && Number(lastTrade.closedPnlRv) >= 0 && lastTrade.priceRp == entry) {
        // if (lastTrade && Number(lastTrade.closedPnlRv) >= 0) {
        //     if (Date.now() - (lastTrade.transactTimeNs / 1000000) < 1000 * 60 * 10) {
        //         throw Error('Cannot place limit order: last trade was win');
        //     }
        // }

        const openPositions = await this.getOpenPositions();
        if (openPositions && openPositions.length > 0) {
            const p = openPositions.find((p: any) => p.symbol == symbol);
            if (p != null) {
                return; // Already have a position with this symbol open
            }
            if (openPositions.length >= 3) {
                throw Error('Cannot place limit order: Max of 3 positions already open');
            }
        }

        const openOrders = (await this.getOpenOrders(symbol))?.data?.rows;
        console.log(openOrders);
        if (openOrders && openOrders.length > 0) {
            if (openOrders[0].side != side) {
                console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] Cancelling all orders for: ${symbol}: Incoming order different side`));
                await this.cancelAllOrderForSymbol(symbol);
                return this.placeLimitOrder(symbol, side, entry, takeProfit, stopLoss);
            }
            if (Number(openOrders[0].priceRp) != Number(entry)) {
                console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] Cancelling all orders for: ${symbol}: Incoming order different price`));
                await this.cancelAllOrderForSymbol(symbol);
                return this.placeLimitOrder(symbol, side, entry, takeProfit, stopLoss);
            }
            // TODO: Get all open orders that are not TP or SL. Check if 3 or more open positions
            return;
        }

        console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] Placing Limit Order: ${side} ${symbol} EP: ${entry}, TP: ${takeProfit}, SL: ${stopLoss}`));

        let balance = (await this.getAccountBalance()) * 0.98;

        const slPercentChange = Math.abs(Number(entry) - Number(stopLoss)) / Number(entry);
        const reqLev = Math.ceil(this.riskPerTrade / slPercentChange);

        if (reqLev > 20) {
            balance = balance * (20 / reqLev)
        }

        const levSlPercentChange = slPercentChange * this.leverage;
        const usdSize = balance / (levSlPercentChange / this.riskPerTrade);
        const quantity = (usdSize * this.leverage / Number(entry)).toFixed(3);
        const decimals = (await this.getProductInformation(symbol)).pricePrecision;

        const placeOrder = await Phemex.PlaceOrder({
            symbol: symbol,
            side: side,
            posSide: side == "Buy" ? "Long" : "Short",
            orderQtyRq: quantity,
            ordType: "Limit",
            priceRp: Number(entry).toFixed(decimals),
            takeProfitRp: Number(takeProfit).toFixed(decimals),
            stopLossRp: Number(stopLoss).toFixed(decimals)
        });

        if (placeOrder.data?.ordStatus == "Created") {
            console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] Successfully placed order: ${placeOrder.data?.orderID}`));
            this.manager.addOrder({ symbol: symbol, orderId: placeOrder.data?.orderID });
        } else {
            console.log(chalk.red(`[${new Date().toLocaleTimeString()}] Error creating order for ${symbol}: ${placeOrder.msg}`));
        }
    }
}

interface TradeManagerOrder { orderId: string, symbol: string, time?: number };

export class TradeManager {
    private client: TradeClient;
    public orders: TradeManagerOrder[];
    constructor() {
        this.client = new TradeClient(this);
        this.orders = [];
    }

    public addOrder = async (order: TradeManagerOrder) => {
        this.orders.push(order);
    }

    private removeOrder = async (orderId: string) => {
        const i = this.orders.findIndex(o => o.orderId == orderId);
        this.orders.splice(i, 1);
    }

    public manageTrades = async () => {
        while (true) {
            try {
                // TODO: AVOID SLIPPAGE SCAM - If price is lingering very close to SL or TP order (within 1-2%), market close the order manually
                // TODO: IF CUMALATIVE ACCOUNT PNL >= 20% , close all positions
                // TODO: tpLevels should be attached to order object

                const positions = await this.client.getOpenPositions();
                for (let i = 0; i < positions.length; i++) {
                    const position = positions[i];
                    const entryPrice = Number(position.avgEntryPriceRp);
                    const orders = (await this.client.getOpenOrders(position.symbol))?.data?.rows;
                    if (!orders) {
                        throw Error('Cant manage trade: TP / SL orders are missing');
                    }
                    const latestPrice = Number(await this.client.getLatestPrice(position.symbol));
                    const sl = orders?.find(o => o.orderType == "Stop");
                    const tp = Number(orders?.find(o => o.orderType == "MarketIfTouched")?.stopPxRp);
                    if (sl == null || tp == null) {
                        if (sl == null) {

                        }
                        throw Error('Cant manage trade: SL or TP missing');
                    }
                    const dstToProfit = Math.abs(tp - entryPrice);
                    let pctToProfit = Math.abs(latestPrice - entryPrice) / dstToProfit;
                    pctToProfit = position.side == "Buy" && latestPrice > entryPrice ? pctToProfit : position.side == "Sell" && latestPrice < entryPrice ? pctToProfit : pctToProfit * -1;
                    // console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] Trade is: ${Math.round(pctToProfit * 100)}% to TP`));
                    // const tpLevels = [{sl: 0.10, tp: 0.20},{sl: 0.20, tp: 0.40},{sl: 0.40, tp: 0.60},{sl: 0.60, tp: 0.80},{sl: 0.80, tp: 0.90}];
                    // const tpLevels: any = [{sl: 0.05, tp: 0.50}]; // 0.50 Retracement target
                    const tpLevels: any = [{sl: 0.05, tp: 0.18}]; // 1.27 Extension target
                    
                    for (let i=tpLevels.length-1; i>=0; i--) {
                        if (position.side == "Buy") {
                            if (Number(sl.stopPxRp) >= entryPrice + (dstToProfit * tpLevels[i].tp)) {
                                break;
                            }
                            if (latestPrice >= entryPrice + (dstToProfit * tpLevels[i].tp)) {
                                console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] ${position.symbol} hit ${tpLevels[i].tp*100}% Profit, Moving SL to ${tpLevels[i].sl*100}%`));
                                const productInfo = await this.client.getProductInformation(position.symbol);
                                await Phemex.AmendOrderById({
                                    orderID: sl.orderID,
                                    posSide: "Long",
                                    stopPxRp: (entryPrice + (dstToProfit * tpLevels[i].sl)).toFixed(productInfo.pricePrecision),
                                    symbol: position.symbol,
                                });
                                break;
                            }
                        } else {
                            if (Number(sl.stopPxRp) <= entryPrice - (dstToProfit * tpLevels[i].tp)) {
                                break;
                            }
                            if (latestPrice <= entryPrice - (dstToProfit * tpLevels[i].tp)) {
                                console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] ${position.symbol} hit ${tpLevels[i].tp*100}% Profit, Moving SL to ${tpLevels[i].sl*100}%`));
                                const productInfo = await this.client.getProductInformation(position.symbol);
                                await Phemex.AmendOrderById({
                                    orderID: sl.orderID,
                                    posSide: "Short",
                                    stopPxRp: (entryPrice - (dstToProfit * tpLevels[i].sl)).toFixed(productInfo.pricePrecision),
                                    symbol: position.symbol,
                                });
                                break;
                            }
                        }
                    }
                }
            } catch (e: any) {
                console.log(e);
            }
            await sleep(10000);
        }
    }

    public manageOrders = async () => {
        while (true) {
            try {
                for (let i = 0; i < this.orders.length; i++) {
                    const orders = (await Phemex.QueryOrdersByIds({ orderID: this.orders[i].orderId, symbol: this.orders[i].symbol }))?.data?.rows;
                    if (orders == null || orders.length == 0) {
                        continue;
                    }
                    for (let i = 0; i < orders.length; i++) {
                        const order = orders[i];
                        if (order.ordStatus == 'Canceled' || order.ordStatus == 'Filled') {
                            this.removeOrder(order.orderId);
                        }
                        if (order.ordStatus == 'New') {
                            if (order.actionTimeNs / 1000000 < Date.now() - 1000 * 60 * 10) {
                                console.log(chalk.magenta(`[${new Date().toLocaleTimeString()}] Cancelling expired order: ${order.side} ${order.symbol} (${order.orderId})`));
                                await this.client.cancelAllOrderForSymbol(order.symbol);
                                this.removeOrder(order.orderId);
                            }
                        }
                    }
                }
            } catch (e: any) {
                console.log(e);
            }
            await sleep(30000);
        }
    }
}