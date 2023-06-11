// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ArrayUtils } from "./lib/ArrayUtils.sol";
import { IAuthenticatedProxy } from "./lib/IAuthenticatedProxy.sol";

// solhint-disable reason-string

contract StaticPawnBroker {
    struct ERC721PawnParams {
        address pawnbroker;
        address pawnTokenAddress;
        uint256 pawnTokenID;
        address debtTokenAddress;
        uint256 debtTokenAmount;
        uint256 deadline;
    }

    struct ERC20Params {
        address tokenAddress;
        uint256 amount;
    }

    // solhint-disable-next-line func-name-mixedcase
    function ERC721PawnForERC20(
        bytes memory extra,
        address[7] memory addresses,
        IAuthenticatedProxy.HowToCall[2] memory howToCalls,
        uint[6] memory uints,
        bytes memory data,
        bytes memory counterdata
    ) external pure returns (uint) {
        require(uints[0] == 0, "ERC721PawnForERC20: nonzero value sent");
        require(howToCalls[0] == IAuthenticatedProxy.HowToCall.Call, "ERC721PawnForERC20: not a direct call");

        (ERC721PawnParams memory params, ERC20Params memory counterparams) = abi.decode(
            extra,
            (ERC721PawnParams, ERC20Params)
        );

        checkERC721Pawn(addresses[2], data, params, addresses[1], addresses[4]);
        checkERC20(addresses[5], counterdata, counterparams, addresses[4], addresses[1]);

        return 1;
    }

    // solhint-disable-next-line func-name-mixedcase
    function ERC20ForERC721Pawn(
        bytes memory extra,
        address[7] memory addresses,
        IAuthenticatedProxy.HowToCall[2] memory howToCalls,
        uint[6] memory uints,
        bytes memory data,
        bytes memory counterdata
    ) external pure returns (uint) {
        require(uints[0] == 0, "ERC20ForERC721Pawn: nonzero value sent");
        require(howToCalls[0] == IAuthenticatedProxy.HowToCall.Call, "ERC20ForERC721Pawn: not a direct call");

        (ERC20Params memory params, ERC721PawnParams memory counterparams) = abi.decode(
            extra,
            (ERC20Params, ERC721PawnParams)
        );

        checkERC20(addresses[2], data, params, addresses[1], addresses[4]);
        checkERC721Pawn(addresses[5], counterdata, counterparams, addresses[4], addresses[1]);

        return 1;
    }

    function checkERC20(
        address to,
        bytes memory data,
        ERC20Params memory params,
        address maker,
        address countermaker
    ) internal pure {
        require(to == params.tokenAddress, "checkERC20: invalid to address");
        require(
            ArrayUtils.arrayEq(data, abi.encodeCall(IERC20.transferFrom, (maker, countermaker, params.amount))),
            "checkERC20: invalid call data"
        );
    }

    function checkERC721Pawn(
        address to,
        bytes memory data,
        ERC721PawnParams memory params,
        address maker,
        address countermaker
    ) internal pure {
        require(to == params.pawnTokenAddress, "checkERC721Pawn: invalid to address");
        require(
            ArrayUtils.arrayEq(
                data,
                abi.encodeWithSignature( // encoding with signature because safeTransferFrom is overloaded
                    "safeTransferFrom(address,address,uint256,bytes)",
                    maker,
                    params.pawnbroker,
                    params.pawnTokenID,
                    // (bondRecipient, debtTokenAddress, debtTokenAmount, deadline)
                    abi.encode(countermaker, params.debtTokenAddress, params.debtTokenAmount, params.deadline)
                )
            ),
            "checkERC721Pawn: invalid call data"
        );
    }
}
