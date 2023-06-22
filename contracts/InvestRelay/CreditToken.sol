// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract CreditToken is ERC721Burnable {
    constructor() ERC721("CreditToken", "CREDIT") {}

    //TODO : mintable check
    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
