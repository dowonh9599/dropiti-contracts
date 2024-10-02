import { ChainId, Networkish } from "../types/chain";

export const CHAIN_ID_TO_NETWORKISH = (id: ChainId): Networkish => {
  switch (id) {
    case ChainId.ETH_SEPOLIA:
      return Networkish.ETH_SEPOLIA;
    default:
      throw new Error(`Unsupported chain id: ${id}`);
  }
};
