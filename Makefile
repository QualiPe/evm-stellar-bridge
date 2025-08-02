prepare-repo:
	cd contracts/stellar && \
	make build && \
	make bindings && \
	cd ../../packages/htlc-contract && \
	pnpm build && \
	cd ../htlc-helpers && \
	pnpm build && \
	cd ../ && \
	pnpm install
