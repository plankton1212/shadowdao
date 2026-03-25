// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ShadowSpace {
    enum Category { DeFi, NFT, Infrastructure, Gaming, Privacy, L2, DAOTooling, Social }

    struct Space {
        address creator;
        string name;
        string description;
        Category category;
        bool isPublic;
        uint256 defaultQuorum;
        uint256 memberCount;
        uint256 proposalCount;
        bool active;
    }

    mapping(uint256 => Space) public spaces;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => address[]) private memberLists;
    mapping(address => uint256[]) private userSpaces;
    uint256 public spaceCount;

    event SpaceCreated(
        uint256 indexed spaceId,
        address indexed creator,
        string name,
        string description,
        uint8 category,
        bool isPublic,
        uint256 defaultQuorum
    );
    event MemberJoined(uint256 indexed spaceId, address indexed member);
    event MemberRemoved(uint256 indexed spaceId, address indexed member);
    event SpaceUpdated(uint256 indexed spaceId, string name, string description);

    function createSpace(
        string calldata _name,
        string calldata _description,
        uint8 _category,
        bool _isPublic,
        uint256 _defaultQuorum,
        address[] calldata _initialMembers
    ) external returns (uint256) {
        require(bytes(_name).length >= 2 && bytes(_name).length <= 100, "Invalid name length");
        require(_category <= uint8(Category.Social), "Invalid category");
        require(_defaultQuorum >= 1, "Quorum must be >= 1");

        uint256 spaceId = spaceCount;
        spaceCount++;

        spaces[spaceId] = Space({
            creator: msg.sender,
            name: _name,
            description: _description,
            category: Category(_category),
            isPublic: _isPublic,
            defaultQuorum: _defaultQuorum,
            memberCount: 1,
            proposalCount: 0,
            active: true
        });

        // Creator is always a member
        isMember[spaceId][msg.sender] = true;
        memberLists[spaceId].push(msg.sender);
        userSpaces[msg.sender].push(spaceId);

        // Add initial members
        for (uint256 i = 0; i < _initialMembers.length; i++) {
            address member = _initialMembers[i];
            if (member != msg.sender && member != address(0) && !isMember[spaceId][member]) {
                isMember[spaceId][member] = true;
                memberLists[spaceId].push(member);
                userSpaces[member].push(spaceId);
                spaces[spaceId].memberCount++;
                emit MemberJoined(spaceId, member);
            }
        }

        emit SpaceCreated(spaceId, msg.sender, _name, _description, _category, _isPublic, _defaultQuorum);
        return spaceId;
    }

    function joinSpace(uint256 _spaceId) external {
        Space storage space = spaces[_spaceId];
        require(space.active, "Space does not exist");
        require(space.isPublic, "Space is invite only");
        require(!isMember[_spaceId][msg.sender], "Already a member");

        isMember[_spaceId][msg.sender] = true;
        memberLists[_spaceId].push(msg.sender);
        userSpaces[msg.sender].push(_spaceId);
        space.memberCount++;

        emit MemberJoined(_spaceId, msg.sender);
    }

    function addMember(uint256 _spaceId, address _member) external {
        Space storage space = spaces[_spaceId];
        require(msg.sender == space.creator, "Only creator can add members");
        require(space.active, "Space does not exist");
        require(!isMember[_spaceId][_member], "Already a member");
        require(_member != address(0), "Invalid address");

        isMember[_spaceId][_member] = true;
        memberLists[_spaceId].push(_member);
        userSpaces[_member].push(_spaceId);
        space.memberCount++;

        emit MemberJoined(_spaceId, _member);
    }

    function removeMember(uint256 _spaceId, address _member) external {
        Space storage space = spaces[_spaceId];
        require(msg.sender == space.creator, "Only creator can remove members");
        require(_member != space.creator, "Cannot remove creator");
        require(isMember[_spaceId][_member], "Not a member");

        isMember[_spaceId][_member] = false;
        space.memberCount--;

        emit MemberRemoved(_spaceId, _member);
    }

    function updateSpace(uint256 _spaceId, string calldata _name, string calldata _description) external {
        Space storage space = spaces[_spaceId];
        require(msg.sender == space.creator, "Only creator can update");
        require(bytes(_name).length >= 2 && bytes(_name).length <= 100, "Invalid name length");

        space.name = _name;
        space.description = _description;

        emit SpaceUpdated(_spaceId, _name, _description);
    }

    function incrementProposalCount(uint256 _spaceId) external {
        // In production, only ShadowVote contract should call this
        spaces[_spaceId].proposalCount++;
    }

    // View functions
    function getSpace(uint256 _spaceId)
        external view returns (
            address creator, string memory name, string memory description,
            uint8 category, bool isPublic, uint256 defaultQuorum,
            uint256 memberCount, uint256 proposalCount, bool active
        )
    {
        Space storage s = spaces[_spaceId];
        return (s.creator, s.name, s.description, uint8(s.category), s.isPublic, s.defaultQuorum, s.memberCount, s.proposalCount, s.active);
    }

    function getSpaceCount() external view returns (uint256) {
        return spaceCount;
    }

    function getMembers(uint256 _spaceId) external view returns (address[] memory) {
        return memberLists[_spaceId];
    }

    function getUserSpaces(address _user) external view returns (uint256[] memory) {
        return userSpaces[_user];
    }

    function isSpaceMember(uint256 _spaceId, address _user) external view returns (bool) {
        return isMember[_spaceId][_user];
    }
}
