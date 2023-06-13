// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IbondToken.sol";
import "./IdebtToken.sol";
import "./IinvestRelayer.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract InvestRelayer is IinvestRelayer, IERC721Receiver {
    PawnContract[] private pawnContracts;

    struct PawnContract {
        uint256 id; // 계약 id
        address pawnTokenAddress; // 담보 토큰(ERC 721)
        address payTokenType; // 코인 종류(ERC 20)
        uint256 deadLine; // 기한
        uint256 repayAmount; // 상환 해야하는 금액
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes data
    ) public override returns (bytes4 data) {
        uint256 parsed;
        assembly {

        parsed:
            mload(add(data))
        }
        abi.decode(data);
        return this.onERC721Received.selector;
    }

    function _createPawnContract(
        address assureToken,
        address payTokenType,
        uint32 deadLine,
        uint256 repayAmount
    ) private {
        PawnContract memory pawnContract = PawnContract(id, assureToken, payTokenType, deadLine, repayAmount);
        this.pawnContracts.push(pawnContract);
    }

    // 유저가 빚을 갚음
    function repay() public {}

    // 1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    // 2. 채권 토큰 소각
    // 3. 전당포 주인에게 대금 전송
    function collectCoin() public {}

    // 1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    // 2. 채권 토큰 소각 (채무 토큰도 소각하거나 그냥 두거나)
    // 3. 전당포 주인에게 담보 토큰 전송
    function collectToken() public {}
}
