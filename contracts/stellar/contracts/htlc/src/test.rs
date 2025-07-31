#![cfg(test)]
extern crate std;
use std::println;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events, Ledger},
    token, Address, Bytes, Env,
};
use token::Client as TokenClient;
use token::StellarAssetClient as TokenAdminClient;

fn create_token_contract<'a>(e: &Env, admin: &Address) -> (TokenClient<'a>, TokenAdminClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(e, &sac.address()),
        token::StellarAssetClient::new(e, &sac.address()),
    )
}

fn create_htlc_contract<'a>(e: &Env) -> HTLCContractClient<'a> {
    HTLCContractClient::new(e, &e.register(HTLCContract, ()))
}

struct HTLCTest<'a> {
    env: Env,
    sender: Address,
    recipient: Address,
    token: TokenClient<'a>,
    contract: HTLCContractClient<'a>,
    preimage: Bytes,
    hashlock: Bytes,
    swap_id: Bytes,
}

impl<'a> HTLCTest<'a> {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        env.ledger().with_mut(|li| {
            li.timestamp = 12345;
        });

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token_admin = Address::generate(&env);

        let (token, token_admin_client) = create_token_contract(&env, &token_admin);
        token_admin_client.mint(&sender, &1000);

        let contract = create_htlc_contract(&env);

        // Create a test preimage and hashlock
        let preimage = Bytes::from_slice(&env, b"secret_preimage_123");
        let hashlock = env.crypto().sha256(&preimage);
        let hashlock_bytes = Bytes::from_slice(&env, &hashlock.to_array());

        // Create a unique swap_id
        let swap_id = Bytes::from_slice(&env, b"test_swap_001");

        HTLCTest {
            env,
            sender,
            recipient,
            token,
            contract,
            preimage,
            hashlock: hashlock_bytes,
            swap_id,
        }
    }

    fn echo_events(&self, operation: &str) {
        println!("\n=== Events after {} ===", operation);
        let events = self.env.events().all();
        if events.is_empty() {
            println!("No events emitted");
        } else {
            for (i, event) in events.iter().enumerate() {
                println!("Event {}: {:?}", i + 1, event);
            }
        }
        println!("========================\n");
    }
}

#[test]
fn test_create_swap() {
    let test = HTLCTest::setup();

    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350, // timelock 5 seconds in the future
    );

    // Echo events
    test.echo_events("create_swap");

    // Verify authorization was required
    assert_eq!(test.env.auths().len(), 1);
    assert_eq!(test.env.auths()[0].0, test.sender);

    assert_eq!(test.token.balance(&test.sender), 200);
    assert_eq!(test.token.balance(&test.contract.address), 800);
    assert_eq!(test.token.balance(&test.recipient), 0);

    // Verify swap was created correctly
    let swap = test.contract.get_swap(&test.swap_id);
    assert!(swap.is_some());
    let swap = swap.unwrap();
    assert_eq!(swap.sender, test.sender);
    assert_eq!(swap.recipient, test.recipient);
    assert_eq!(swap.token, test.token.address);
    assert_eq!(swap.amount, 800);
    assert_eq!(swap.hashlock, test.hashlock);
    assert_eq!(swap.timelock, 12350);
    assert!(!swap.is_withdrawn);
    assert!(!swap.is_refunded);
}

#[test]
fn test_withdraw_success() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Withdraw using the correct preimage
    test.contract
        .withdraw(&test.swap_id, &test.recipient, &test.preimage);

    // Echo events
    test.echo_events("withdraw");

    // Verify authorization was required
    assert_eq!(test.env.auths().len(), 1);
    assert_eq!(test.env.auths()[0].0, test.recipient);

    assert_eq!(test.token.balance(&test.sender), 200);
    assert_eq!(test.token.balance(&test.contract.address), 0);
    assert_eq!(test.token.balance(&test.recipient), 800);

    // Verify swap is marked as withdrawn
    let swap = test.contract.get_swap(&test.swap_id);
    assert!(swap.is_some());
    let swap = swap.unwrap();
    assert!(swap.is_withdrawn);
    assert!(!swap.is_refunded);
    assert!(swap.preimage.is_some());
}

#[test]
fn test_refund_success() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Advance time past the timelock
    test.env.ledger().with_mut(|li| {
        li.timestamp = 12351;
    });

    // Refund the swap
    test.contract.refund(&test.swap_id, &test.sender);

    // Echo events
    test.echo_events("refund");

    // Verify authorization was required
    assert_eq!(test.env.auths().len(), 1);
    assert_eq!(test.env.auths()[0].0, test.sender);

    assert_eq!(test.token.balance(&test.sender), 1000);
    assert_eq!(test.token.balance(&test.contract.address), 0);
    assert_eq!(test.token.balance(&test.recipient), 0);

    // Verify swap is marked as refunded
    let swap = test.contract.get_swap(&test.swap_id);
    assert!(swap.is_some());
    let swap = swap.unwrap();
    assert!(!swap.is_withdrawn);
    assert!(swap.is_refunded);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_create_swap_invalid_amount() {
    let test = HTLCTest::setup();

    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &0,
        &test.hashlock,
        &12350,
    );
}

#[test]
#[should_panic(expected = "hashlock must be 32 bytes (SHA256)")]
fn test_create_swap_invalid_hashlock() {
    let test = HTLCTest::setup();

    let invalid_hashlock = Bytes::from_slice(&test.env, b"invalid_hash");

    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &invalid_hashlock,
        &12350,
    );
}

#[test]
#[should_panic(expected = "timelock must be in the future")]
fn test_create_swap_past_timelock() {
    let test = HTLCTest::setup();

    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12344, // Past timestamp
    );
}

#[test]
#[should_panic(expected = "swap_id already exists")]
fn test_create_swap_duplicate_swap_id() {
    let test = HTLCTest::setup();

    // Create first swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Try to create another swap with the same swap_id
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &400,
        &test.hashlock,
        &12350,
    );
}

#[test]
#[should_panic(expected = "invalid preimage")]
fn test_withdraw_invalid_preimage() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Try to withdraw with wrong preimage
    let wrong_preimage = Bytes::from_slice(&test.env, b"wrong_preimage");
    test.contract
        .withdraw(&test.swap_id, &test.recipient, &wrong_preimage);
}

#[test]
#[should_panic(expected = "unauthorized recipient")]
fn test_withdraw_unauthorized_recipient() {
    let test = HTLCTest::setup();
    let unauthorized_recipient = Address::generate(&test.env);

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Try to withdraw with unauthorized recipient
    test.contract
        .withdraw(&test.swap_id, &unauthorized_recipient, &test.preimage);
}

#[test]
#[should_panic(expected = "timelock expired")]
fn test_withdraw_after_timelock() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Advance time past the timelock
    test.env.ledger().with_mut(|li| {
        li.timestamp = 12351;
    });

    // Try to withdraw after timelock expired
    test.contract
        .withdraw(&test.swap_id, &test.recipient, &test.preimage);
}

#[test]
#[should_panic(expected = "timelock not expired yet")]
fn test_refund_before_timelock() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Try to refund before timelock expires
    test.contract.refund(&test.swap_id, &test.sender);
}

#[test]
#[should_panic(expected = "unauthorized sender")]
fn test_refund_unauthorized_sender() {
    let test = HTLCTest::setup();
    let unauthorized_sender = Address::generate(&test.env);

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Advance time past the timelock
    test.env.ledger().with_mut(|li| {
        li.timestamp = 12351;
    });

    // Try to refund with unauthorized sender
    test.contract.refund(&test.swap_id, &unauthorized_sender);
}

#[test]
#[should_panic(expected = "swap already withdrawn")]
fn test_double_withdraw() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Withdraw successfully
    test.contract
        .withdraw(&test.swap_id, &test.recipient, &test.preimage);

    // Try to withdraw again
    test.contract
        .withdraw(&test.swap_id, &test.recipient, &test.preimage);
}

#[test]
#[should_panic(expected = "swap already refunded")]
fn test_double_refund() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Advance time past the timelock
    test.env.ledger().with_mut(|li| {
        li.timestamp = 12351;
    });

    // Refund successfully
    test.contract.refund(&test.swap_id, &test.sender);

    // Try to refund again
    test.contract.refund(&test.swap_id, &test.sender);
}

#[test]
fn test_verify_preimage() {
    let test = HTLCTest::setup();

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Verify correct preimage
    assert!(test.contract.verify_preimage(&test.swap_id, &test.preimage));

    // Verify incorrect preimage
    let wrong_preimage = Bytes::from_slice(&test.env, b"wrong_preimage");
    assert!(!test
        .contract
        .verify_preimage(&test.swap_id, &wrong_preimage));
}

#[test]
fn test_get_swap_none() {
    let test = HTLCTest::setup();

    // No swap created yet
    let swap = test.contract.get_swap(&test.swap_id);
    assert!(swap.is_none());
}

#[test]
fn test_swap_exists() {
    let test = HTLCTest::setup();

    // No swap created yet
    assert!(!test.contract.swap_exists(&test.swap_id));

    // Create the swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &800,
        &test.hashlock,
        &12350,
    );

    // Swap should exist now
    assert!(test.contract.swap_exists(&test.swap_id));
}

#[test]
fn test_multiple_swaps() {
    let test = HTLCTest::setup();

    // Create first swap
    test.contract.create_swap(
        &test.swap_id,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &400,
        &test.hashlock,
        &12350,
    );

    // Create second swap with different swap_id
    let swap_id_2 = Bytes::from_slice(&test.env, b"test_swap_002");
    test.contract.create_swap(
        &swap_id_2,
        &test.sender,
        &test.recipient,
        &test.token.address,
        &300,
        &test.hashlock,
        &12350,
    );

    // Verify both swaps exist
    assert!(test.contract.swap_exists(&test.swap_id));
    assert!(test.contract.swap_exists(&swap_id_2));

    // Verify they are independent
    let swap1 = test.contract.get_swap(&test.swap_id).unwrap();
    let swap2 = test.contract.get_swap(&swap_id_2).unwrap();

    assert_eq!(swap1.amount, 400);
    assert_eq!(swap2.amount, 300);

    // Withdraw first swap
    test.contract
        .withdraw(&test.swap_id, &test.recipient, &test.preimage);

    // Second swap should still be available
    assert!(test.contract.swap_exists(&swap_id_2));
    let swap2_after = test.contract.get_swap(&swap_id_2).unwrap();
    assert!(!swap2_after.is_withdrawn);
    assert!(!swap2_after.is_refunded);
}
