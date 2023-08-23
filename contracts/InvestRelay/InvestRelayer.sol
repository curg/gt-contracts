// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InvestRelayer is IERC721Receiver, ERC721Burnable, Ownable {
    constructor() ERC721("Golden-Teeth", "GT") {}

    event ERC721Received(address token, address operator, address from, uint256 tokenId, bytes data);
    event ERC1155Received(address token, address operator, address from, uint256 id, uint256 value, bytes data);

    PawnContract[] public pawnContracts;

    //    event PawnContractCreated(address debtor, address creditor, PawnContract pawnContract);
    struct PawnContract {
        address pawnTokenAddress; // 담보 토큰 (ERC 721)
        uint256 pawnTokenId; //담보 토큰 id(ERC 721)
        address payTokenAddress; // 코인 종류(ERC 20)
        uint256 deadline; // 기한
        uint256 debtAmount; // 상환 해야하는 금액
    }

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public override returns (bytes4) {
        address debtorAddress = from;
        address creditorAddress;
        address pawnTokenAddress = msg.sender;
        address payTokenAddress;
        uint256 deadline;
        uint256 debtAmount;
        (creditorAddress, payTokenAddress, debtAmount, deadline) = abi.decode(
            data,
            (address, address, uint256, uint256)
        );

        PawnContract memory pawnContract = PawnContract(
            pawnTokenAddress,
            tokenId,
            payTokenAddress,
            deadline,
            debtAmount
        );
        _createPawnContract(debtorAddress, creditorAddress, pawnContract);
        emit ERC721Received(msg.sender, operator, from, tokenId, data);
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        address debtorAddress;
        address creditorAddress;
        address pawnTokenAddress = msg.sender;
        address payTokenAddress;
        uint256 deadline;
        uint256 debtAmount;
        (debtorAddress, creditorAddress, payTokenAddress, deadline, debtAmount) = abi.decode(
            data,
            (address, address, address, uint256, uint256)
        );

        PawnContract memory pawnContract = PawnContract(
            pawnTokenAddress,
            tokenId,
            payTokenAddress,
            deadline,
            debtAmount
        );
        _createPawnContract(debtorAddress, creditorAddress, pawnContract);
        emit ERC1155Received(msg.sender, operator, from, tokenId, value, data);
        return msg.sig;
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
        require(pawnContracts[pawnId].deadline > block.timestamp, "debt expired");
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
        require(pawnContracts[pawnId].deadline < block.timestamp, "debt not expired");
        burn(pawnId * 2 + 1);
        IERC721 pawnToken = IERC721(pawnContracts[pawnId].pawnTokenAddress);
        pawnToken.transferFrom(address(this), msg.sender, pawnContracts[pawnId].pawnTokenId);
        delete pawnContracts[pawnId];
    }
}
