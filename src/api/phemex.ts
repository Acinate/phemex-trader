import assert from 'assert';
import request from 'request';
import crypto from 'crypto';
import chalk from 'chalk';
import { TradesHistoryParams, TradesHistoryResponse } from '../../types/queryTradesHistory';
import { QueryOpenOrdersBySymbolParams, QueryOpenOrdersBySymbolResponse } from '../../types/queryOpenOrders';
import { PlaceOrderParams, PlaceOrderResponse } from '../../types/placeLimitOrder';
import { AmendOrderByIdParams } from '../../types/amendOrderById';
import { API_KEY, API_SECRET } from './secret';

// NOTE: This API Wrapper only wraps the 'Hedged Contract Rest API' functions

// Query Product Information `GET /exchange/public/products`
export const QueryProductInformation = async (): Promise<any> => {
    return await getRequest("/public/products");
};

// Trade API List `PUT /g-orders/create`
export const PlaceOrder = async (params: PlaceOrderParams): Promise<PlaceOrderResponse> => {
    return await postRequest("/g-orders", params);
};

// Amend order by orderID `PUT /g-orders/replace`
export const AmendOrderById = async (params: AmendOrderByIdParams) => {
    return await putRequest("/g-orders/replace", params);
}

// Cancel Single Order by orderID `DELETE /g-orders/cancel`
interface ICancelSingleOrderById {
    orderID?: string; // order id, cannot be changed, orderID and clOrdID can not be both empty
    clOrdID?: string; //clOrdID id, cannot be changed
    symbol: string; // which symbol to cancel order
    posSide: string; // position direction
}
export const CancelSingleOrderById = async (params: ICancelSingleOrderById) => {
    return await deleteRequest("/g-orders/cancel", params);
}

interface ICancelAllOrders {
    symbol?: string;
    untriggered?: boolean;
    text?: string;
}
// Cancel All Orders `DELETE /g-orders/all`
export const CancelAllOrders = async (params: ICancelAllOrders) => {
    return await deleteRequest("/g-orders/all", params);
}

interface QueryAccountPositionsParams {
    symbol?: string;
    currency: string;
}
// Query trading account and positions `GET /g-accounts/accountPositions`
export const QueryAccountPositions = async (params: QueryAccountPositionsParams): Promise<any> => {
    return await getRequest("/g-accounts/accountPositions", params);
};

interface ISetLeverage {
    symbol: string; // symbol to set leverage
    leverageRr?: string; // new leverage value, if leverageRr exists, the position side is merged. either leverageRr or longLeverageRr and shortLeverageRr should exist.
    longLeverageRr?: string; // new long leverage value, if longLeverageRr exists, the position side is hedged. either leverageRr or longLeverageRr and shortLeverageRr should exist.
    shortLeverageRr?: string; // new short leverage value, if shortLeverageRr exists, the position side is hedged. either leverageRr or longLeverageRr and shortLeverageRr should exist.
}
// Set leverage `PUT /g-positions/leverage`
export const SetLeverage = async (params: ISetLeverage): Promise<any> => {
    return await putRequest("/g-positions/leverage", params);
}

// Query open orders by symbol `GET /g-orders/activeList`
export const QueryOpenOrdersBySymbol = async (params: QueryOpenOrdersBySymbolParams): Promise<QueryOpenOrdersBySymbolResponse> => {
    return await getRequest("/g-orders/activeList", params);
}

interface IQueryClosedOrdersBySymbol {
    symbol?: string; // which symbol to query
    currency: string; // which currency to query
    ordStatus?: 5 | 6 | 1 | 7 | 8; // order status code list filter [New(5), PartiallyFilled(6), Untriggered(1), Filled(7), Canceled(8)]
    ordType?: number; // order type code list filter [Market (1), Limit (2), Stop (3), StopLimit (4), MarketIfTouched (5), LimitIfTouched (6), ProtectedMarket (7), MarketAsLimit (8), StopAsLimit (9), MarketIfTouchedAsLimit (10), Bracket (11), BoTpLimit (12), BoSlLimit (13), BoSlMarket (14)]
    start?: number; // start time range, Epoch millis，available only from the last 2 month
    end?: number; // end time range, Epoch millis
    offset?: number; // offset to resultset 	
    limit?: number; // limit of resultset, max 200
    withCount?: boolean; // if true, result info will contains count info.
}
// Query closed orders by symbol `GET /exchange/order/v2/orderList`
export const QueryClosedOrdersBySymbol = async (params?: IQueryClosedOrdersBySymbol) => {
    return await getRequest("/exchange/order/v2/orderList",params);
}

// Query kline data `GET /exchange/public/md/v2/kline?symbol=<symbol>&resolution=<resolution>&limit=<limit>`
export const QueryKline = async (params: any) => {
    assert(params, "No Parameters were passed");
    assert(params.symbol, "Parameter symbol is required");
    assert(params.resolution, "Parameter resolution is required");
    return await getRequest("/exchange/public/md/v2/kline", params);
}

interface IQuery24Ticker {
    symbol: string;
}
// Query 24 Hours Ticker `GET /md/trade`
export const Query24Ticker = async (params: IQuery24Ticker): Promise<any> => {
    return await getRequest("/md/v2/ticker/24hr", params);
};

interface IQueryOrdersHistory {
    symbol?: string;
    symbols?: string;
    currency?: string;
    start?: number;
    end?: number;
    offset?: number;
    limit?: number;
}
// Query Orders By Ids `GET /api-data/g-futures/orders`
export const QueryOrdersHistory = async (params: IQueryOrdersHistory): Promise<any> => {
    return await getRequest("/api-data/g-futures/orders", params);
}

interface IQueryOrdersById {
    symbol: string;
    orderID?: string;
    clOrdID?: string;
}
// Query Orders By Ids `GET /api-data/g-futures/orders/by-order-id`
export const QueryOrdersByIds = async (params: IQueryOrdersById): Promise<any> => {
    return await getRequest("/api-data/g-futures/orders/by-order-id", params);
}

// Query Trades History `GET /api-data/g-futures/trades`

export const QueryTradesHistory = async (params: TradesHistoryParams): Promise<TradesHistoryResponse> => {
    return await getRequest("/api-data/g-futures/trades", params);
}

interface IQueryFundsDetail {
    currency?: string;
    type?: number;
    start?: number;
    end?: number;
    offset?: number;
    limit?: number;
    withCount? :number;
}
// Query Funds Detail `GET /api-data/futures/v2/tradeAccountDetail`
export const QueryFundsDetail = async (params?: IQueryFundsDetail) => {
    return await getRequest('/api-data/futures/v2/tradeAccountDetail', params);
} 

// import axios from "axios";

// dotenv.config();  // Load environment variables from .env file 

const baseURL = "https://api.phemex.com";
const wsEndpoint = "wss://api.phemex.com/md";

export const getRequest = async (endpoint: string, params?: any): Promise<any> => {
    return await makeRequest("GET", endpoint, params);
  };

export const postRequest = async (endpoint: string, params: any): Promise<any> => {
    return await makeRequest("POST", endpoint, params);
};

export const putRequest = async (endpoint: string, params: any): Promise<any> => {
    return await makeRequest("PUT", endpoint, params);
};

export const deleteRequest = async (endpoint: string, params: any): Promise<any> => {
    return await makeRequest("DELETE", endpoint, params);
};

export const makeRequest = async (method: string, endpoint: string, params: any) => {
    let expiry = Date.now() + 60000;
    let signature;
    let content;

    if (method === "GET" || method === "DELETE" || method === "PUT") {
        // Lets check if params is not undefined
        if (params !== undefined) {
            content = `${endpoint}${serializeParams(params) + expiry}`;
        } else {
            content = `${endpoint}${expiry}`;
        };
    }

    if (method === "POST") {
        content = `${endpoint}${expiry + JSON.stringify(params)}`;
        if (params.hasOwnProperty("otpCode")) {
          let otpCode = params.otpCode;
          delete params.otpCode;
          content = `${endpoint}otpCode=${otpCode}${expiry + JSON.stringify(params)}`;
          endpoint = `${endpoint}?otpCode=${otpCode}`;
        }
    }

    signature = generateSignature(content, API_SECRET);

    const options: any = {
        url: [baseURL, endpoint].join(""),
        method,
        json: true,
        timeout: 3500,
        headers: {
          "x-phemex-access-token": API_KEY,
          "x-phemex-request-expiry": expiry,
          "x-phemex-request-signature": signature,
        }
    }

    if (method === "GET" || method === "PUT" || method === "DELETE") {
        if (params) {
          options.qs = params;
        }
    }

    if (method === "POST") {
        options.body = params;
    }

    const sendRequest = async (retry=1) => {
        return new Promise((resolve, reject) => {
            // console.log(options);
            request(options, async (error: any, response: any, body: any) => {
                // console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] ${options.method} ${options.url}`));
                if (error) {
                if (retry < 20) {
                    // console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] Retry #${retry} ${options.url}`));
                    retry = retry + 1;
                    // return await makeRequest(method, endpoint, params, retry);
                    sendRequest(retry).then(resolve).catch(reject);
                } else {
                    reject(error);
                }
              } else {
                resolve(body);
              }
            });
        });
    }

    return sendRequest();
}

const generateSignature = (message: any, secret: any) => {
    return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

const serializeParams = (params: any) => {
    return Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
}