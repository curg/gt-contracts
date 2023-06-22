import { BigNumberish, BytesLike, ethers } from "ethers";

export interface PawnContract {
  id: BigNumberish; //계약 id
  pawnTokenAddress: string; //ERC721 address
  pawnTokenId: BigNumberish; //ERC721 id
  payTokenAddress: string; //ERC20 address
  debtAmount: BigNumberish; //채무금액
  deadline: BigNumberish; //기한
}

export const PawnContractType = {
  PawnContract: [
    { types: "uint256", name: "id" },
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
      [
        "address",
        "address",
        "tuple(uint256 id, address pawnTokenAddress, uint256 pawnTokenId, address payTokenAddress, uint256 debtAmount, uint256 deadline)",
      ],
      [from, bob, pawnContract]
    ),
  ];
}
