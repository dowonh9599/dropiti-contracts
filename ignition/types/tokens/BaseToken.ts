export enum BaseTokenSymbol {
  E_HKD = "eHKD",
}

export interface IBaseToken {
  address: string;
  decimal: number;
  symbol: BaseTokenSymbol;
}
