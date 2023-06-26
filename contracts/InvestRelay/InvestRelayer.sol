// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract InvestRelayer is IERC721Receiver, ERC721Burnable {
    constructor() ERC721("Golden-Teeth", "GT") {}

    PawnContract[] public pawnContracts;

    //    event PawnContractCreated(address debtor, address creditor, PawnContract pawnContract);
    struct PawnContract {
        address pawnTokenAddress; // 담보 토큰 (ERC 721)
        uint256 pawnTokenId; //담보 토큰 id(ERC 721)
        address payTokenAddress; // 코인 종류(ERC 20)
        uint256 deadLine; // 기한
        uint256 debtAmount; // 상환 해야하는 금액
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public override returns (bytes4) {
        address debtorAddress;
        address creditorAddress;
        address pawnTokenAddress;
        uint256 pawnTokenId;
        address payTokenAddress;
        uint256 deadLine;
        uint256 debtAmount;
        (debtorAddress, creditorAddress, pawnTokenAddress, pawnTokenId, payTokenAddress, deadLine, debtAmount) = abi
            .decode(data, (address, address, address, uint256, address, uint256, uint256));

        PawnContract memory pawnContract = PawnContract(
            pawnTokenAddress,
            pawnTokenId,
            payTokenAddress,
            deadLine,
            debtAmount
        );
        _createPawnContract(debtorAddress, creditorAddress, pawnContract);
        return this.onERC721Received.selector;
    }

    function _createPawnContract(address _debtor, address _creditor, PawnContract memory _pawnContract) private {
        uint256 id = pawnContracts.length;
        pawnContracts.push(_pawnContract);
        _mint(_debtor, id * 2);
        _mint(_creditor, id * 2 + 1);
    }

    // 유저가 빚을 갚음
    function repay(uint256 pawnId) public {
        require(ownerOf(pawnId * 2) == msg.sender, "Not a debtor");
        require(pawnContracts[pawnId].deadLine < block.timestamp, "debt expired");
        burn(pawnId * 2);
        IERC721 payToken = IERC721(pawnContracts[pawnId].payTokenAddress);
        IERC721 pawnToken = IERC721(pawnContracts[pawnId].pawnTokenAddress);
        payToken.transferFrom(msg.sender, address(this), pawnContracts[pawnId].debtAmount);
        pawnToken.transferFrom(address(this), msg.sender, pawnContracts[pawnId].pawnTokenId);

        delete pawnContracts[pawnId].pawnTokenAddress;
        delete pawnContracts[pawnId].pawnTokenId;
    }

    //     1. 유효성 검사 및 전당포 주인의 채권 토큰 확인
    //     2. 채권 토큰 소각 (채무 토큰도 소각하거나 그냥 두거나)
    //     3. 전당포 주인에게 담보 토큰 전송
    function collectPay(uint256 pawnId) public {
        require(ownerOf(pawnId * 2 + 1) == msg.sender, "Not a creditor");
        require(pawnContracts[pawnId].pawnTokenAddress == address(0), "Not payed");
        burn(pawnId * 2 + 1);
        IERC20 payToken = IERC20(pawnContracts[pawnId].payTokenAddress);
        payToken.transfer(msg.sender, pawnContracts[pawnId].debtAmount);
        delete pawnContracts[pawnId];
    }

    function collectAssure(uint256 pawnId) public {
        require(ownerOf(pawnId * 2 + 1) == msg.sender, "Not a creditor");
        require(pawnContracts[pawnId].deadLine < block.timestamp, "debt not expired");
        burn(pawnId * 2 + 1);
        IERC721 pawnToken = IERC721(pawnContracts[pawnId].pawnTokenAddress);
        pawnToken.transferFrom(address(this), msg.sender, pawnContracts[pawnId].pawnTokenId);
        delete pawnContracts[pawnId];
    }
}
