interface Order {
    bizError: number; // 0,
    orderID: string; // '849bc552-4314-466a-a2c1-7f55da9b981a',
    clOrdID: string; // '',
    symbol: string; // 'SOLUSDT',
    side: string; // 'Sell',
    actionTimeNs: number; // 1699494050015626500,
    transactTimeNs: number; // 1699494050015626500,
    orderType: string; // 'Limit',
    priceRp: string; // '43.491',
    orderQtyRq: string; // '4.46',
    displayQtyRq: string; // '4.463',
    timeInForce: string; // 'GoodTillCancel',
    reduceOnly: boolean; // false,
    closedPnlRv: string; // '0',
    closedSizeRq: string; // '0',
    cumQtyRq: string; // '0',
    cumValueRv: string; // '0',
    leavesQtyRq: string; // '4.46',
    leavesValueRv: string; // '193.96986',
    stopDirection: string; // 'UNSPECIFIED',
    stopPxRp: string; // '0',
    trigger: string; // 'UNSPECIFIED',
    pegOffsetValueRp: string; // '0',
    pegOffsetProportionRr: string; // '0',
    execStatus: string; // 'PendingNew',
    pegPriceType: string; // 'UNSPECIFIED',
    ordStatus: string; // 'Created',
    execInst: string; // 'None',
    takeProfitRp: string; // '42.996',
    stopLossRp: string; // '43.761'
  }

export interface PlaceOrderParams {
    clOrdID?: string;
    symbol: string;
    reduceOnly?: boolean;
    closeOnTrigger?: boolean;
    orderQtyRq?: string;
    ordType?: "Market" | "Limit" | "Stop" | "StopLimit" | "MarketIfTouched" | "LimitIfTouched" | "ProtectedMarket" | "MarketAsLimit" | "StopAsLimit" | "MarketIfTouchedAsLimit" | "Bracket" | "BoTpLimit" | "BoSlLimit" | "BoSlMarket";
    priceRp?: string;
    side: "Buy" | "Sell";
    posSide: "Merged" | "Long" | "Short";
    text?: string;
    timeInForce?: "GoodTillCancel" | "ImmediateOrCancel" | "FillOrKill" | "PostOnly";
    stopPxRp?: string; // Trigger price for stop orders
    takeProfitRp?: string; // Real take profit price
    stopLossRp?: string; // Real stop loss price
    pegOffsetValueRp?: string; // Trailing offset from current price. Negative value when position is long, positive when position is short
    pegPriceType?: "LastPeg" | "MidPricePeg" | "MarketPeg" | "PrimaryPeg" | "TrailingStopPeg" | "TrailingTakeProfitPeg"; // Trailing order price type
    triggerType?: "ByMarkPrice" | "ByIndexPrice" | "ByLastPrice" | "ByAskPrice" | "ByBidPrice" | "ByMarkPriceLimit" | "ByLastPriceLimit"; // Trigger source
    tpTrigger?: "ByMarkPrice" | "ByIndexPrice" | "ByLastPrice" | "ByAskPrice" | "ByBidPrice" | "ByMarkPriceLimit" | "ByLastPriceLimit"; // Trigger source
    slTrigger?: "ByMarkPrice" | "ByIndexPrice" | "ByLastPrice" | "ByAskPrice" | "ByBidPrice" | "ByMarkPriceLimit" | "ByLastPriceLimit"; // Trigger source
}

export interface PlaceOrderResponse {
    code: 0,
    msg: '',
    data: Order | null
  }