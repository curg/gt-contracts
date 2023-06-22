// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract InvestRelayer is IERC721Receiver {
    PawnContract[] private pawnContracts;
    mapping(address => uint256) private debtor;
    mapping(address => uint256) private creditor;

    //    event PawnContractCreated(address debtor, address creditor, PawnContract pawnContract);

    struct PawnContract {
        uint256 id; // 계약 id
        address pawnTokenAddress; // 담보 토큰 주소(ERC 721)
        uint256 pawnTokenId; //담보 토큰 id(ERC 721)
        address payTokenType; // 코인 종류(ERC 20)
        uint256 deadLine; // 기한
        uint256 debtAmount; // 상환 해야하는 금액
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public override returns (bytes4) {
        PawnContract memory pawnContract;
        address debtorAddress;
        address creditorAddress;
        (debtorAddress, creditorAddress, pawnContract) = abi.decode(data, (address, address, PawnContract));
        _createPawnContract(debtorAddress, creditorAddress, pawnContract);
        return this.onERC721Received.selector;
    }

    function _createPawnContract(address _debtor, address _creditor, PawnContract memory _pawnContract) private {
        pawnContracts.push(_pawnContract);
        debtor[_debtor] = pawnContracts.length;
        creditor[_creditor] = pawnContracts.length;
    }

    // 유저가 빚을 갚음
    //    function repay() public {
    //        uint256 pawnId = debtor[msg.sender];
    //        IERC20 payToken = ERC20(pawnContracts[pawnId].payTokenType);
    //
    //        require(payToken.balanceOf(msg.sender) > pawnContracts[pawnId], "Lack of Balance");
    //        //        payToken.transferFrom();
    //    }

    // 1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    // 2. 채권 토큰 소각 (채무 토큰도 소각하거나 그냥 두거나)
    // 3. 전당포 주인에게 담보 토큰 전송
    function collectToken() public {}

    function collectCoin() public {}
}
