// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IbondToken.sol";
import "./IdebtToken.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IinvestRelayer {
    //계약 생성
    function createPawnContract(
        address assureToken,
        address payTokenType,
        uint32 deadLine,
        uint256 repayAmount
    ) external;

    // 유저가 빚을 갚음
    function repay() external;

    // 1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    // 2. 채권 토큰 소각
    // 3. 전당포 주인에게 대금 전송
    function collectCoin() external;

    // 1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    // 2. 채권 토큰 소각 (채무 토큰도 소각하거나 그냥 두거나)
    // 3. 전당포 주인에게 담보 토큰 전송
    function collectToken() external;
}
