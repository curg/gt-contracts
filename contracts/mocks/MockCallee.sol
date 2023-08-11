// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockCallee {
    event MockCalled(address from, uint256 value, bytes data);

    fallback() external payable {
        _fallback();
    }

    receive() external payable {
        _fallback();
    }

    function _fallback() private {
        emit MockCalled(msg.sender, msg.value, msg.data);
    }
}
