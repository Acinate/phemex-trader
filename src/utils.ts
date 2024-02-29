export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const mapToObject = (m: Map<any, any>): Object => {
    return Array.from(m).reduce((obj: any, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}

export const isFilteredSymbol = (symbol: string) => {
  
    if (symbol.includes("DOWNUSDT") || symbol.includes("UPUSDT")) {
      return true;
    }
  
    if (symbol.slice(symbol.length-4) != "USDT") {
      return true;
    }
  
    const fSymbols = [
      'USDCUSDT', 'TUSDUSDT', 'BUSDUSDT', 'EURUSDT', 'USDPUSDT', 'FDUSD',
      'COCOSUSDT', 'BTSUSDT', 'CVCUSDT', 'BTTUSDT', 'LENDUSDT', 'SRMUSDT',
      'RAYUSDT', 'FTTUSDT', 'SCUSDT', 'LUNAUSDT', 'HNTUSDT', 'BTCSTUSDT'
    ];

    if (fSymbols.includes(symbol)) {
      return true;
    }
  
    return false;
  }