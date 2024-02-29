export interface AmendOrderByIdParams {
    symbol: string;
    orderID?: string;
    origClOrdID?: string;
    priceRp?: string;
    orderQtyRq?: string;
    stopPxRp?: string;
    takeProfitRp?: string;
    stopLossRp?: string;
    pegOffsetValueRp?: string;
    pegPriceType?: string;
    triggerType?: string;
    posSide: "Long" | "Short";
}