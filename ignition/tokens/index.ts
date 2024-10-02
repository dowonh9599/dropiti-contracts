import { ChainId } from "../types/chain";
import { BaseTokenSymbol, IBaseToken } from "../types/tokens";
import { BaseTokensSepolia } from "./sepolia";
export * from "./sepolia";

export const BaseTokensByChainId: Record<
  ChainId,
  Record<BaseTokenSymbol, IBaseToken>
> = {
  [ChainId.ETH_SEPOLIA]: BaseTokensSepolia,
};
