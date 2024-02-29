export interface TradesHistoryParams {
    symbol?: string;
    symbols?: string;
    currency?: string;
    start?: number;
    end?: number;
    offset?: number;
    limit?: number;
}

export interface TradesHistory {
    transactTimeNs: number; // 1699454522983275000,
    symbol: string; // 'BTCUSDT',
    currency: string; // 'USDT',
    action: string; // 'New',
    side: string; // 'Buy',
    tradeType: string; // 'Trade',
    execQtyRq: string; // '0.018',
    execPriceRp: string; // '35270.4',
    orderQtyRq: string; // '0.018',
    priceRp: string; // '35270.4',
    execValueRv: string; // '634.8672',
    feeRateRr: string; // '0.0001',
    execFeeRv: string; // '0.06348672',
    closedSizeRq: string; // '0',
    closedPnlRv: string; // '0',
    ordType: string; // 'Limit',
    execID: string; // '56da847f-118f-5d6e-8df3-64ae254caf7b',
    orderID: string; // '7dbce90c-1201-487e-aecb-ba5ad4a21aa8',
    clOrdID: string; // '',
    execStatus: string; // 'MakerFill'
  }

export interface TradesHistoryResponse {
    code: number;
    msg: string;
    data?: {
        rows: TradesHistory[]
    }
}