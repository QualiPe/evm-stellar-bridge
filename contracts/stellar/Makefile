test: build
	cargo test

build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

deploy:
	stellar contract deploy --wasm target/wasm32v1-none/release/htlc.wasm --source hackathon --network testnet > contract_id.txt

bindings:
	stellar contract bindings typescript --overwrite --output-dir ../../packages/htlc-contract --wasm target/wasm32v1-none/release/htlc.wasm
	pnpm package:prepare

fmt:
	cargo fmt --all

clean:
	cargo clean
