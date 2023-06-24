// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract STWhitelist is Context, AccessControl {
    bytes32 public constant WHITELIST_ADMIN_ROLE = keccak256("AGREEMENT_ADMIN_ROLE");

    mapping(address => bool) public isAuthorized;
    mapping(address => uint256) public agreedVersion;
    uint256 public latestVersion;
    bytes32 public agreementHash;

    function agree(bytes32 agreeWith) public {
        require(agreeWith == agreementHash, "STWhitelist: outdated agreement");
        agreedVersion[_msgSender()] = latestVersion;
    }

    function setAuthorized(address account, bool authorized) external onlyRole(WHITELIST_ADMIN_ROLE) {
        isAuthorized[account] = authorized;
    }

    function updateAgreement(bytes32 newAgreementHash) external onlyRole(WHITELIST_ADMIN_ROLE) {
        agreementHash = newAgreementHash;
        latestVersion++;
    }

    function isWhitelistedNow(address account) public view returns (bool) {
        return agreedVersion[account] == latestVersion;
    }
}
