export default function Bridge() {
    return (
      <main className="ll-container">
        <h1 className="ll-title">LumenLink</h1>
  
        <div className="ll-grid">
          <section className="ll-panel" aria-label="EVM panel">
            <h2 className="ll-panel-title">Ethereum</h2>
            {/* Here will be EvmPanel */}
          </section>
  
          <section className="ll-panel" aria-label="Plan panel">
            <h2 className="ll-panel-title">Plan</h2>
            {/* Here will be PlanPanel */}
          </section>
  
          <section className="ll-panel" aria-label="Stellar panel">
            <h2 className="ll-panel-title">Stellar</h2>
            {/* Here will be StellarPanel */}
          </section>
        </div>
      </main>
    );
  }