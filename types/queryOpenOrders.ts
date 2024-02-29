export interface OpenOrder  {
    bizError: number,
    orderID: string,
    clOrdID: string,
    symbol: string,
    side: "Buy" | "Sell",
    actionTimeNs: number,
    transactTimeNs: number,
    orderType: string,
    priceRp: string,
    orderQtyRq: string,
    displayQtyRq: string,
    timeInForce: string,
    reduceOnly: boolean,
    closedPnlRv: string,
    closedSizeRq: string,
    cumQtyRq: string,
    cumValueRv: string,
    leavesQtyRq: string,
    leavesValueRv: string,
    stopDirection: string,
    stopPxRp: string,
    trigger: string,
    pegOffsetValueRp: string,
    pegOffsetProportionRr: string,
    execStatus: string,
    pegPriceType: string,
    ordStatus: string,
    execInst: string,
    takeProfitRp: string,
    stopLossRp: string
}

export interface QueryOpenOrdersBySymbolParams {
    symbol: string;
}

export interface QueryOpenOrdersBySymbolResponse {
    code: number;
    msg: string;
    data?: {
        rows: OpenOrder[]
    }
}