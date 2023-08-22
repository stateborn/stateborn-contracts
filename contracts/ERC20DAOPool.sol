import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Proposal.sol";

contract ERC20DAOPool {

    IERC20 private token;
    address private daoAddress;
    uint256 private _withdrawTimelock;
    mapping(address => uint256) private balances;
    mapping(address => uint256) public withdrawTimelocks;
    mapping(address => address[]) public proposalForVotes;
    mapping(address => address[]) public proposalAgainstVotes;

    event TokensDeposited(address indexed user, address indexed tokenAddress, uint256 amount);
    event TokensWithdrawn(address indexed user, address indexed tokenAddress, uint256 amount, address indexed withdrawAddress);

    constructor(address _tokenAddress, address _daoAddress, uint256 _withdrawTimelock) {
        token = IERC20(_tokenAddress);
    }

    function unlock(uint256 amount) public {
        IERC20 token = IERC20(token);
        withdrawTimelocks[msg.sender] = block.timestamp + _withdrawTimelock;
    }

    function lockup() public {
        delete withdrawTimelocks[msg.sender];
    }

    function deposit(uint256 amount) public {
        require(token.approve(address(this), amount), "Approval failed");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender] += amount;
        emit TokensDeposited(msg.sender, address(token), amount);
    }

    function withdraw(uint256 amount, address withdrawAddress) public {
        require(withdrawTimelocks[msg.sender] != 0, "Withdraw locked");
        require(withdrawTimelocks[msg.sender] <= block.timestamp, "Withdraw not unlocked yet");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(token.transferFrom(address(this), withdrawAddress, amount), "Transfer failed");
        balances[msg.sender] -= amount;
        if (balances[msg.sender] == 0) {
            delete balances[msg.sender];
            delete withdrawTimelocks[msg.sender];
        }
        emit TokensWithdrawn(msg.sender, address(token), amount, withdrawAddress);
    }

    function vote(address proposalAddress, bool vote) public {
        require(balanceOf(msg.sender) >= 0, "Insufficient balance");
        if (vote) {
            proposalForVotes[proposalAddress].push(msg.sender);
        } else {
            proposalAgainstVotes[proposalAddress].push(msg.sender);
        }
    }

    function resolveProposal(address _proposalAddress) public {
        Proposal proposal = Proposal(_proposalAddress);
        require(proposal.isEnded(), "Proposal not ended");
        address[] memory voters = proposal.isPassed() ? proposalForVotes[_proposalAddress] : proposalAgainstVotes[_proposalAddress];
        uint256 toTransferAmount = 0;
        for (uint256 i = 0; i < voters.length; i++) {
            address voterAddress = voters[i];
            toTransferAmount += balanceOf(voterAddress);
            delete balances[voterAddress];
            token.transfer(daoAddress, toTransferAmount);
        }
        if (proposal.isPassed()) {
            delete proposalForVotes[_proposalAddress];
        } else {
            delete proposalAgainstVotes[_proposalAddress];
        }
    }

    function balanceOf(address account) public view returns (uint256) {
        if (withdrawTimelocks[account] != 0) {
            return 0;
        }
        return balances[account];
    }

}