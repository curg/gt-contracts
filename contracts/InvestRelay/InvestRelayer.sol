// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./DebtToken.sol";
import "./CreditToken.sol";

contract InvestRelayer is IERC721Receiver {
    PawnContract[] private pawnContracts;
    DebtToken private debtToken;
    CreditToken private creditToken;

    constructor(address _debtTokenAddress, address _creditTokenAddress) {
        debtToken = DebtToken(_debtTokenAddress);
        creditToken = CreditToken(_creditTokenAddress);
    }

    //    event PawnContractCreated(address debtor, address creditor, PawnContract pawnContract);

    struct PawnContract {
        uint256 id; // 계약 id
        address pawnTokenAddress; // 담보 토큰 주소(ERC 721)
        uint256 pawnTokenId; //담보 토큰 id(ERC 721)
        address payTokenType; // 코인 종류(ERC 20)
        uint256 deadLine; // 기한
        uint256 debtAmount; // 상환 해야하는 금액
        bool isClosed; // 상환 여부
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
        // TODO : 데이터 포맷 확인
        _createPawnContract(debtorAddress, creditorAddress, pawnContract);
        return this.onERC721Received.selector;
    }

    function _createPawnContract(address _debtor, address _creditor, PawnContract memory _pawnContract) private {
        //TODO : balance check
        IERC721 pawnToken = IERC721(_pawnContract.pawnTokenAddress);
        require(pawnToken.ownerOf(_pawnContract.pawnTokenId) == _debtor, "not a pawn owner");
        IERC20 payToken = IERC20(_pawnContract.payTokenType);
        require(payToken.allowance(_debtor, address(this)) >= _pawnContract.debtAmount, "Lack of Allowance"); // address(this)가 아니라 wyvern?
        _pawnContract.id = pawnContracts.length;
        pawnContracts.push(_pawnContract);
        debtToken.mint(_debtor, _pawnContract.id);
        creditToken.mint(_creditor, _pawnContract.id);
    }

    // 유저가 빚을 갚음
    function repay(uint256 amount, uint256 pawnId) public {
        require(debtToken.ownerOf(pawnId) == msg.sender, "Not a debtor");
        require(pawnContracts[pawnId].deadLine < block.timestamp, "debt expired");
        IERC20 payToken = IERC20(pawnContracts[pawnId].payTokenType);
        require(payToken.allowance(msg.sender, address(this)) >= pawnContracts[pawnId].debtAmount, "Lack of Allowance");
        payToken.transferFrom(msg.sender, address(this), pawnContracts[pawnId].debtAmount);
        IERC721 pawnToken = IERC721(pawnContracts[pawnId].pawnTokenAddress);
        pawnToken.safeTransferFrom(address(this), msg.sender, pawnContracts[pawnId].pawnTokenId);
        debtToken.burn(pawnId);
        pawnContracts[pawnId].isClosed = true;
    }

    //     1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    //     2. 채권 토큰 소각 (채무 토큰도 소각하거나 그냥 두거나)
    //     3. 전당포 주인에게 담보 토큰 전송
    function collectToken(uint256 pawnId) public {
        require(creditToken.ownerOf(pawnId) == msg.sender, "Not a creditor");
        if (pawnContracts[pawnId].isClosed) {
            IERC20 payToken = ERC20(pawnContracts[pawnId].payTokenType);
            require(payToken.balanceOf(address(this)) >= pawnContracts[pawnId].debtAmount, "Lack of Allowance");
            payToken.transfer(msg.sender, pawnContracts[pawnId].debtAmount);
            creditToken.burn(pawnId);
            return;
        }
        require(pawnContracts[pawnId].deadLine >= block.timestamp, "debt not expired");
        IERC721 pawnToken = IERC721(pawnContracts[pawnId].pawnTokenAddress);
        pawnToken.safeTransferFrom(address(this), msg.sender, pawnContracts[pawnId].pawnTokenId);
        creditToken.burn(pawnId);
    }
}
