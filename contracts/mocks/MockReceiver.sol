// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import { MockCallee } from "./MockCallee.sol";

contract MockReceiver is MockCallee, IERC721Receiver {
    event ERC721Received(address token, address operator, address from, uint256 tokenId, bytes data);
    event ERC1155Received(address token, address operator, address from, uint256 id, uint256 value, bytes data);
    event ERC1155BatchReceived(
        address token,
        address operator,
        address from,
        uint256[] id,
        uint256[] value,
        bytes data
    );

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        emit ERC721Received(msg.sender, operator, from, tokenId, data);
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        emit ERC1155Received(msg.sender, operator, from, id, value, data);
        return msg.sig;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4) {
        emit ERC1155BatchReceived(msg.sender, operator, from, ids, values, data);
        return msg.sig;
    }
}
