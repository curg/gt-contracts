// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract DebtToken is ERC721Burnable {
    mapping(address => uint256) private debtor;

    constructor() ERC721("DebtToken", "DEBT") {}

    //TODO : mintal
    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
