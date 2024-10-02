import { BaseTokenSymbol, IBaseToken } from "../types/tokens";
import eHKDAddress from "../../deployed/sepolia/eHKD.json";

export const BaseTokensSepolia: Record<BaseTokenSymbol, IBaseToken> = {
  [BaseTokenSymbol.E_HKD]: {
    address: eHKDAddress.address,
    decimal: 6,
    symbol: BaseTokenSymbol.E_HKD,
  },
};
