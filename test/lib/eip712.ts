import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { IERC5267 } from "../../typechain-types";

export async function getDomain(contract: IERC5267): Promise<TypedDataDomain> {
  const { fields, name, version, chainId, verifyingContract, extensions } = await contract.eip712Domain();

  if (fields !== "0x0f" || extensions.length !== 0) {
    throw new Error("unsupported eip712 domain structure");
  }

  return {
    name,
    version,
    chainId,
    verifyingContract,
  };
}
