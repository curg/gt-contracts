// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract SelfCallMetaTransaction is EIP712("SelfCallMetaTransaction", "0.1.0"), ERC2771Context(address(this)) {
    struct SelfCallRequest {
        bytes data;
        uint256 deadline;
        uint256 salt;
    }

    struct RequestAndSignaturePair {
        SelfCallRequest req;
        bytes signature;
    }

    bytes32 private constant _TYPEHASH = keccak256("SelfCallRequest(bytes data, uint256 deadline, uint256 salt)");

    mapping(bytes32 => bool) private _invalid;

    event Executed(bytes32 indexed hash, bool success, bytes returndata);

    function execute(SelfCallRequest calldata req, bytes calldata signature) external {
        _execute(req, signature);
    }

    function batchExecute(RequestAndSignaturePair[] calldata pairs) external {
        for (uint256 i = 0; i < pairs.length; i++) {
            RequestAndSignaturePair calldata p = pairs[i];
            _execute(p.req, p.signature);
        }
    }

    function getHashAndSigner(
        SelfCallRequest calldata req,
        bytes calldata signature
    ) public view returns (bytes32 hash, address signer) {
        if (signature.length == 0) {
            return (bytes32(0), msg.sender);
        }

        bytes32 dataHash = keccak256(req.data);
        signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(_TYPEHASH, dataHash, req.deadline, req.salt))),
            signature
        );
        hash = keccak256(abi.encodePacked(signer, dataHash, req.deadline, req.salt));
    }

    function _execute(SelfCallRequest calldata req, bytes calldata signature) internal {
        (bytes32 hash, address signer) = getHashAndSigner(req, signature);
        require(!_invalid[hash], "SelfCallMetaTransaction: already executed");
        require(req.deadline < block.timestamp, "SelfCallMetaTransaction: deadline exceeded");

        if (hash != bytes32(0)) {
            _invalid[hash] = true;
        }

        (bool success, bytes memory returndata) = address(this).call(abi.encodePacked(req.data, signer));

        emit Executed(hash, success, returndata);
    }
}
