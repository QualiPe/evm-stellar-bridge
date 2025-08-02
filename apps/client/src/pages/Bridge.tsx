import EvmPanel from '../components/EvmPanel';

export default function Bridge() {
    return (
      <main className="ll-container">
        <h1 className="ll-title">LumenLink</h1>
  
        <div className="ll-grid">
          <section className="ll-panel" aria-label="EVM panel">
            <EvmPanel />
          </section>
  
          <section className="ll-panel" aria-label="Plan panel">
            <h2 className="ll-panel-title">Plan</h2>
            {/* PlanPanel */}
          </section>
  
          <section className="ll-panel" aria-label="Stellar panel">
            <h2 className="ll-panel-title">Stellar</h2>
            {/* StellarPanel */}
          </section>
        </div>
      </main>
    );
}