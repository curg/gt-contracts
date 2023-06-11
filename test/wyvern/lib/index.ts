/* An order, convenience struct. */
import { BigNumber, BigNumberish, BytesLike, ethers } from "ethers";
import { TypedDataField } from "@ethersproject/abstract-signer";

export interface Order {
  /* Order registry address. */
  registry: string;
  /* Order maker address. */
  maker: string;
  /* Order static target. */
  staticTarget: string;
  /* Order static selector. */
  staticSelector: BytesLike;
  /* Order static extradata. */
  staticExtradata: BytesLike;
  /* Order maximum fill factor. */
  maximumFill: BigNumberish;
  /* Order listing timestamp. */
  listingTime: BigNumberish;
  /* Order expiration timestamp - 0 for no expiry. */
  expirationTime: BigNumberish;
  /* Order salt to prevent duplicate hashes. */
  salt: BigNumberish;
}

export enum HowToCall {
  Call,
  DelegateCall,
}

/* A call, convenience struct. */
export interface Call {
  /* Target */
  target: string;
  /* How to call */
  howToCall: HowToCall;
  /* Calldata */
  data: BytesLike;
}

export const orderTypes: Record<string, Array<TypedDataField>> = {
  Order: [
    { type: "address", name: "registry" },
    { type: "address", name: "maker" },
    { type: "address", name: "staticTarget" },
    { type: "bytes4", name: "staticSelector" },
    { type: "bytes", name: "staticExtradata" },
    { type: "uint256", name: "maximumFill" },
    { type: "uint256", name: "listingTime" },
    { type: "uint256", name: "expirationTime" },
    { type: "uint256", name: "salt" },
  ],
};

export function encodeSignature(sig: BytesLike): string {
  return ethers.utils.defaultAbiCoder.encode(
    ["uint8", "bytes32", "bytes32"],
    [ethers.utils.hexDataSlice(sig, 64), ethers.utils.hexDataSlice(sig, 0, 32), ethers.utils.hexDataSlice(sig, 32, 64)]
  );
}

export function atomicMatchArgs(
  order: Order,
  sig: BytesLike,
  call: Call,
  counterorder: Order,
  countersig: BytesLike,
  countercall: Call,
  metadata: BytesLike
): readonly [
  [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ],
  [BytesLike, BytesLike],
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  [BigNumberish, BigNumberish],
  BytesLike,
  BytesLike
] {
  return [
    [
      order.registry,
      order.maker,
      order.staticTarget,
      order.maximumFill,
      order.listingTime,
      order.expirationTime,
      order.salt,
      call.target,
      counterorder.registry,
      counterorder.maker,
      counterorder.staticTarget,
      counterorder.maximumFill,
      counterorder.listingTime,
      counterorder.expirationTime,
      counterorder.salt,
      countercall.target,
    ],
    [order.staticSelector, counterorder.staticSelector],
    order.staticExtradata,
    call.data,
    counterorder.staticExtradata,
    countercall.data,
    [call.howToCall, countercall.howToCall],
    metadata,
    ethers.utils.defaultAbiCoder.encode(["bytes", "bytes"], [encodeSignature(sig), encodeSignature(countersig)]),
  ];
}

//Order memory order, Call memory call, Order memory counterorder, Call memory countercall, address matcher, uint value, uint fill
//bytes memory extra,
//         address[7] memory addresses,
//         IAuthenticatedProxy.HowToCall[2] memory howToCalls,
//         uint[6] memory uints,
//         bytes memory data,
//         bytes memory counterdata
export function staticCallArgs(
  order: Order,
  call: Call,
  counterorder: Order,
  countercall: Call,
  matcher: string,
  value: BigNumberish,
  fill: BigNumberish
): readonly [
  BytesLike,
  [string, string, string, string, string, string, string],
  [BigNumberish, BigNumberish],
  [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish],
  BytesLike,
  BytesLike
] {
  return [
    order.staticExtradata,
    [order.registry, order.maker, call.target, counterorder.registry, counterorder.maker, countercall.target, matcher],
    [call.howToCall, countercall.howToCall],
    [value, order.maximumFill, order.listingTime, order.expirationTime, counterorder.listingTime, fill],
    call.data,
    countercall.data,
  ];
}
