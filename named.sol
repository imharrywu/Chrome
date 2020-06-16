pragma solidity >=0.4.22;

contract NameBase {
    
    struct Value {
        address owner_;
        string value_;
    }
    
    address manager_;
    mapping(string => Value) base_;
    mapping(bytes32 => address) new_;

    constructor() public {
        manager_ = msg.sender;
    }

    function ticket_new(uint256 salted_name_sha256hash) public returns (uint256 /*ticket*/) {
        bytes32 ticket = bytes32(sha256(abi.encodePacked(salted_name_sha256hash)));
        new_[ticket] = msg.sender;
        return uint256(ticket);
    }
    
    function ticket_die(uint256 ticket) public returns (bool /*yes*/) {
        if (msg.sender != new_[bytes32(ticket)]) return false;
        delete new_[bytes32(ticket)];
        return true;
    }
    
    function name_new_with_ticket(string memory salt, string memory name, string memory v) public returns (bool /*yes*/){
        bytes32 ticket = bytes32(sha256(abi.encodePacked(sha256(abi.encodePacked(salt, name)))));
        if (msg.sender != new_[ticket]) return false;
        Value memory val; val.owner_ = msg.sender; val.value_ = v;
        base_[name] = val;
        delete new_[ticket];
        return true;
    }
    
    function name_new(string memory name, string memory v) public returns (bool /*yes*/){
        Value memory val; val.owner_ = msg.sender; val.value_ = v;
        base_[name] = val;
        return true;
    }

    function name_update(string memory name, string memory v, address to) public returns (bool /*yes*/){
        if (address(0) == base_[name].owner_) return false;
        if (msg.sender != base_[name].owner_) return false;
        base_[name].value_ = v;
        base_[name].owner_ = to;
        return true; 
    }
    
    function name_die(string memory name) public returns (bool/*yes*/){
        if (address(0) == base_[name].owner_) return false;
        if (msg.sender != base_[name].owner_) return false;
        delete base_[name];
        return true; 
    }
    
    function name_query(string memory name) public view returns (string memory /*Value*/){
        return base_[name].value_;
    }
    
    function name_is_reserved(string memory name) public pure returns (bool /*yes*/){
        return bytes(name)[0] == '!';
    }
    
    function op_is_authorized() public view returns (bool /*yes*/){
        return msg.sender == manager_;
    }
}
