import EvmPanel from '../components/EvmPanel';
import StellarPanel from '../components/StellarPanel';
import PlanPanel from '../components/PlanPanel';

export default function Bridge() {
    return (
      <main className="ll-container">
        <h1 className="ll-title">LumenLink</h1>
  
        <div className="ll-grid">
          <section className="ll-panel" aria-label="EVM panel">
            <EvmPanel />
          </section>
  
          <section className="ll-panel" aria-label="Plan panel">
            <PlanPanel />
          </section>
  
          <section className="ll-panel" aria-label="Stellar panel">
            <StellarPanel />
          </section>
        </div>
      </main>
    );
}