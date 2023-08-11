// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SelfCallMetaTransaction } from "../utils/SelfCallMetaTransaction.sol";

contract MockSelfCallMetaTransaction is SelfCallMetaTransaction {
    function msgSender() external view returns (address) {
        return _msgSender();
    }

    function revertYay() external pure {
        revert("yay");
    }
}
