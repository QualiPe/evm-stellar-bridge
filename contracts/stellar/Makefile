deployer_secret := $(shell cat .env | grep DEPLOYER_SECRET | cut -d '=' -f 2)
issuer_secret := $(shell cat .env | grep ISSUER_SECRET | cut -d '=' -f 2)
asset_address := $(shell cat .env | grep ASSET_ADDRESS | cut -d '=' -f 2)

default: build

all: test

test: build
	cargo test

build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

bindings:
	stellar contract bindings typescript --overwrite --output-dir ../../packages/htlc-contract --wasm target/wasm32v1-none/release/htlc.wasm
	pnpm package:prepare

deploy:
	stellar contract deploy --wasm target/wasm32v1-none/release/htlc.wasm --source $(deployer_secret) --network testnet

deploy-asset:
	stellar contract asset deploy --source $(issuer_secret) --network testnet --asset $(asset_address)

fmt:
	cargo fmt --all

clean:
	cargo clean
