export interface ProductInformation {
    symbol: string; // "XMRUSDT"
    code: number; // 52941
    type: string; // "PerpetualV2"
    displaySymbol: string; // "XMR / USDT"
    indexSymbol: string; // ".XMRUSDT"
    markSymbol: string; // ".MXMRUSDT"
    fundingRateSymbol: string; // ".XMRUSDTFR"
    fundingRate8hSymbol: string; // ".XMRUSDTFR8H"
    contractUnderlyingAssets: string; // "XMR"
    settleCurrency: string; // "USDT"
    quoteCurrency: string; // "USDT"
    tickSize: string; // "0.01"
    priceScale: number; // 0
    ratioScale: number; // 0
    pricePrecision: number; // 2
    baseCurrency: string; // "XMR"
    description: string; // "XMR/USDT perpetual contracts are priced on the .XMRUSDT Index. Each contract is worth 1 XMR. Funding fees are paid and received every 8 hours at UTC time: 00:00, 08:00 and 16:00.",
    status: string; // "Listed"
    tipOrderQty: number; // 0
    listTime: number; // 1671796800000
    majorSymbol: boolean; // false
    defaultLeverage: string; // "-10"
    fundingInterval: string; // 28800
    maxLeverage: number // 100
    maxOrderQtyRq: string; // "3500"
    maxPriceRp: string; // "200000000"
    minOrderValueRv: string; // "1"
    minPriceRp: string; // "100.0"
    qtyPrecision: number // 3
    qtyStepSize: string; //"0.001"
    tipOrderQtyRq: string // "700"
}