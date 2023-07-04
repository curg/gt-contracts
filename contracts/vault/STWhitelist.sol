// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract STWhitelist is Context, AccessControl {
    struct WhitelistSlot {
        bool isAuthorized;
        uint64 agreedVersion;
    }

    bytes32 public constant WHITELIST_ADMIN_ROLE = keccak256("AGREEMENT_ADMIN_ROLE");

    uint64 public latestVersion;
    bytes32 public agreementHash;
    mapping(address => WhitelistSlot) private _slotByAccount;

    event Agreed(address indexed account, uint64 version);
    event AuthorizedChanged(address indexed account, bool authorized);
    event AgreementUpdated(bytes32 hash, uint64 version);

    function agree(bytes32 agreeWith) external {
        require(agreeWith == agreementHash, "STWhitelist: wrong agreement hash");
        address account = _msgSender();
        uint64 v = latestVersion;
        _slotByAccount[account].agreedVersion = v;
        emit Agreed(account, v);
    }

    function disagree() external {
        address account = _msgSender();
        _slotByAccount[account].agreedVersion = 0;
        emit Agreed(account, 0);
    }

    function setAuthorized(address account, bool authorized) external onlyRole(WHITELIST_ADMIN_ROLE) {
        _slotByAccount[account].isAuthorized = authorized;
        emit AuthorizedChanged(account, authorized);
    }

    function updateAgreement(bytes32 newAgreementHash) external onlyRole(WHITELIST_ADMIN_ROLE) {
        agreementHash = newAgreementHash;
        latestVersion++;
        emit AgreementUpdated(agreementHash, latestVersion);
    }

    function isAgreed(address account) public view returns (bool) {
        return _slotByAccount[account].agreedVersion == latestVersion;
    }

    function isAuthorized(address account) public view returns (bool) {
        return _slotByAccount[account].isAuthorized;
    }

    function isWhitelistedNow(address account) public view returns (bool) {
        WhitelistSlot memory slot = _slotByAccount[account];
        return slot.isAuthorized && slot.agreedVersion == latestVersion;
    }
}
