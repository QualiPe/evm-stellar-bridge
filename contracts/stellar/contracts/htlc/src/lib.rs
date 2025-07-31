#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Bytes, Env, Symbol,
};

// Event symbols
const SWAP_CREATED: Symbol = symbol_short!("CREATED");
const SWAP_WITHDRAWN: Symbol = symbol_short!("WITHDRAWN");
const SWAP_REFUNDED: Symbol = symbol_short!("REFUNDED");

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Swap(Bytes),
}

#[derive(Clone)]
#[contracttype]
pub struct HTLCSwap {
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub amount: i128,
    pub hashlock: Bytes,         // SHA256 hash of the preimage
    pub timelock: u64,           // Unix timestamp when refund becomes possible
    pub preimage: Option<Bytes>, // Optional preimage for unlocking
    pub is_withdrawn: bool,
    pub is_refunded: bool,
}

#[contract]
pub struct HTLCContract;

#[contractimpl]
impl HTLCContract {
    /// Create a new HTLC swap
    ///
    /// # Arguments
    /// * `swap_id` - Unique identifier for the swap
    /// * `sender` - Address that locks the funds
    /// * `recipient` - Address that can claim the funds with preimage
    /// * `token` - Token contract address
    /// * `amount` - Amount of tokens to lock
    /// * `hashlock` - SHA256 hash of the preimage (32 bytes)
    /// * `timelock` - Unix timestamp when refund becomes possible
    pub fn create_swap(
        env: Env,
        swap_id: Bytes,
        sender: Address,
        recipient: Address,
        token: Address,
        amount: i128,
        hashlock: Bytes,
        timelock: u64,
    ) {
        // Ensure sender authorized this call
        sender.require_auth();

        // Validate inputs
        if amount <= 0 {
            panic!("amount must be positive");
        }
        if hashlock.len() != 32 {
            panic!("hashlock must be 32 bytes (SHA256)");
        }
        if timelock <= env.ledger().timestamp() {
            panic!("timelock must be in the future");
        }

        // Check if swap_id already exists
        if env
            .storage()
            .instance()
            .has(&DataKey::Swap(swap_id.clone()))
        {
            panic!("swap_id already exists");
        }

        // Transfer tokens from sender to contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        // Create the swap
        let swap = HTLCSwap {
            sender: sender.clone(),
            recipient: recipient.clone(),
            token: token.clone(),
            amount,
            hashlock: hashlock.clone(),
            timelock,
            preimage: None,
            is_withdrawn: false,
            is_refunded: false,
        };

        // Store the swap
        env.storage()
            .instance()
            .set(&DataKey::Swap(swap_id.clone()), &swap);

        // Emit swap created event
        env.events().publish(
            (SWAP_CREATED, symbol_short!("swap")),
            (
                swap_id, sender, recipient, token, amount, hashlock, timelock,
            ),
        );
    }

    /// Withdraw funds using the preimage
    ///
    /// # Arguments
    /// * `swap_id` - Unique identifier for the swap
    /// * `recipient` - Address claiming the funds (must match swap recipient)
    /// * `preimage` - The preimage that hashes to the hashlock
    pub fn withdraw(env: Env, swap_id: Bytes, recipient: Address, preimage: Bytes) {
        // Ensure recipient authorized this call
        recipient.require_auth();

        let swap: HTLCSwap = env
            .storage()
            .instance()
            .get(&DataKey::Swap(swap_id.clone()))
            .expect("swap not found");

        // Check if already withdrawn or refunded
        if swap.is_withdrawn {
            panic!("swap already withdrawn");
        }
        if swap.is_refunded {
            panic!("swap already refunded");
        }

        // Verify recipient
        if swap.recipient != recipient {
            panic!("unauthorized recipient");
        }

        // Verify preimage matches hashlock
        let computed_hash = env.crypto().sha256(&preimage);
        let computed_bytes = Bytes::from_slice(&env, &computed_hash.to_array());
        if computed_bytes != swap.hashlock {
            panic!("invalid preimage");
        }

        // Check timelock hasn't expired
        if env.ledger().timestamp() >= swap.timelock {
            panic!("timelock expired");
        }

        // Transfer tokens to recipient
        let token_client = token::Client::new(&env, &swap.token);
        token_client.transfer(&env.current_contract_address(), &recipient, &swap.amount);

        // Mark as withdrawn
        let mut updated_swap = swap;
        updated_swap.is_withdrawn = true;
        updated_swap.preimage = Some(preimage.clone());
        env.storage()
            .instance()
            .set(&DataKey::Swap(swap_id.clone()), &updated_swap);

        // Emit swap withdrawn event
        env.events().publish(
            (SWAP_WITHDRAWN, symbol_short!("withdraw")),
            (
                swap_id,
                updated_swap.sender,
                recipient,
                updated_swap.token,
                updated_swap.amount,
                preimage,
            ),
        );
    }

    /// Refund funds to sender after timelock expires
    ///
    /// # Arguments
    /// * `swap_id` - Unique identifier for the swap
    /// * `sender` - Address that originally locked the funds
    pub fn refund(env: Env, swap_id: Bytes, sender: Address) {
        // Ensure sender authorized this call
        sender.require_auth();

        let swap: HTLCSwap = env
            .storage()
            .instance()
            .get(&DataKey::Swap(swap_id.clone()))
            .expect("swap not found");

        // Check if already withdrawn or refunded
        if swap.is_withdrawn {
            panic!("swap already withdrawn");
        }
        if swap.is_refunded {
            panic!("swap already refunded");
        }

        // Verify sender
        if swap.sender != sender {
            panic!("unauthorized sender");
        }

        // Check timelock has expired
        if env.ledger().timestamp() < swap.timelock {
            panic!("timelock not expired yet");
        }

        // Transfer tokens back to sender
        let token_client = token::Client::new(&env, &swap.token);
        token_client.transfer(&env.current_contract_address(), &sender, &swap.amount);

        // Mark as refunded
        let mut updated_swap = swap;
        updated_swap.is_refunded = true;
        env.storage()
            .instance()
            .set(&DataKey::Swap(swap_id.clone()), &updated_swap);

        // Emit swap refunded event
        env.events().publish(
            (SWAP_REFUNDED, symbol_short!("refund")),
            (
                swap_id,
                sender,
                updated_swap.recipient,
                updated_swap.token,
                updated_swap.amount,
            ),
        );
    }

    /// Get the swap details for a specific swap_id
    ///
    /// # Arguments
    /// * `swap_id` - Unique identifier for the swap
    pub fn get_swap(env: Env, swap_id: Bytes) -> Option<HTLCSwap> {
        env.storage().instance().get(&DataKey::Swap(swap_id))
    }

    /// Check if a preimage is valid for a specific swap
    ///
    /// # Arguments
    /// * `swap_id` - Unique identifier for the swap
    /// * `preimage` - The preimage to verify
    pub fn verify_preimage(env: Env, swap_id: Bytes, preimage: Bytes) -> bool {
        let swap: HTLCSwap = env
            .storage()
            .instance()
            .get(&DataKey::Swap(swap_id))
            .expect("swap not found");

        let computed_hash = env.crypto().sha256(&preimage);
        let computed_bytes = Bytes::from_slice(&env, &computed_hash.to_array());
        computed_bytes == swap.hashlock
    }

    /// Check if a swap exists
    ///
    /// # Arguments
    /// * `swap_id` - Unique identifier for the swap
    pub fn swap_exists(env: Env, swap_id: Bytes) -> bool {
        env.storage().instance().has(&DataKey::Swap(swap_id))
    }
}

mod test;
