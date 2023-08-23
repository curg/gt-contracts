import { BigNumberish, BytesLike, ethers } from "ethers";

export interface PawnContract {
  pawnTokenAddress: string; //ERC721 address
  pawnTokenId: BigNumberish; //ERC721 id
  payTokenAddress: string; //ERC20 address
  debtAmount: BigNumberish; //채무금액
  deadline: BigNumberish; //기한
}

export const PawnContractType = {
  PawnContract: [
    { types: "address", name: "pawnTokenAddress" },
    { types: "uint256", name: "pawnTokenId" },
    { types: "address", name: "payTokenAddress" },
    { types: "uint256", name: "debtAmount" },
    { types: "uint256", name: "deadline" },
  ],
};

export function onReceivedArgs(
  operator: string,
  from: string,
  tokenId: BigNumberish,
  pawnContract: PawnContract,
  bob: string
): readonly [string, string, BigNumberish, BytesLike] {
  return [
    operator,
    from,
    tokenId,
    ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "uint256", "address", "uint256", "uint256"],
      [from, bob, pawnContract]
    ),
  ];
}

export function safeTransferFromArgs(
  from: string,
  to: string,
  bob: string,
  tokenId: BigNumberish,
  data: PawnContract
): readonly [string, string, BigNumberish, BytesLike] {
  return [
    from,
    to,
    tokenId,
    ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256"],
      [bob, data.payTokenAddress, data.debtAmount, data.deadline]
    ),
  ];
}
