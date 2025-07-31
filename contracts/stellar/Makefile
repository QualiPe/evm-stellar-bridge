test: build
	cargo test

build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

bindings:
	stellar contract bindings typescript --overwrite --output-dir ../../packages/htlc-contract --wasm target/wasm32v1-none/release/htlc.wasm

fmt:
	cargo fmt --all

clean:
	cargo clean
