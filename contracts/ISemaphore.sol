// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title ISemaphore  -  minimal Semaphore v4 interface used by ShadowDAO
/// @notice Mirrors @semaphore-protocol/contracts (v4.x). Only the functions
///         ShadowDAO actually calls are declared here, so the project carries
///         no extra Solidity dependency. The Semaphore protocol contract is
///         already deployed deterministically on Ethereum Sepolia at
///         0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D  -  ShadowDAO points at
///         that instance, it does not deploy its own.
/// @dev    Wave 5: powers anonymous, coercion-resistant eligibility. A voter
///         proves space membership in zero knowledge; the contract never sees
///         their address.
interface ISemaphore {
    /// @dev Semaphore zero-knowledge proof parameters. Field order and types
    ///      MUST match @semaphore-protocol/contracts exactly  -  this struct is
    ///      ABI-decoded from calldata and forwarded verbatim to Semaphore.
    struct SemaphoreProof {
        uint256 merkleTreeDepth;
        uint256 merkleTreeRoot;
        uint256 nullifier;
        uint256 message;
        uint256 scope;
        uint256[8] points;
    }

    /// @dev Creates a group with `admin` as the group administrator.
    /// @return The id of the newly created group.
    function createGroup(address admin) external returns (uint256);

    /// @dev Adds an identity commitment to a group. Callable only by the group
    ///      admin (ShadowSpace registers itself as admin of every space group).
    function addMember(uint256 groupId, uint256 identityCommitment) external;

    /// @dev Verifies a Semaphore proof and consumes its nullifier. Reverts if
    ///      the proof is invalid, the Merkle root is unknown/expired, or the
    ///      nullifier was already used (this is what prevents double-voting).
    function validateProof(uint256 groupId, SemaphoreProof calldata proof) external;
}
