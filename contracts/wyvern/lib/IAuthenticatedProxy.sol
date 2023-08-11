// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAuthenticatedProxy {
    enum HowToCall {
        Call,
        DelegateCall
    }

    function proxy(address dest, HowToCall howToCall, bytes memory data) external returns (bool result);

    function proxyAssert(address dest, HowToCall howToCall, bytes memory data) external;
}
