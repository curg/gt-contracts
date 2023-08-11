import { TypedDataField } from "@ethersproject/abstract-signer";

export const selfCallRequestTypes: Record<string, Array<TypedDataField>> = {
  SelfCallRequest: [
    { type: "bytes", name: "data" },
    { type: "uint256", name: "deadline" },
    { type: "uint256", name: "salt" },
  ],
};
