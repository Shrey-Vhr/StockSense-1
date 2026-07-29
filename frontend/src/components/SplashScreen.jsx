import { CandlestickChart } from 'lucide-react';

/**
 * Boot splash. Timing is unchanged — App.jsx still dismisses it after 2500ms.
 *
 * The keyframes used to be injected with dangerouslySetInnerHTML and consumed
 * via arbitrary `animate-[typing_2s_steps(30,end),...]` classes. They now live
 * in index.css alongside every other keyframe, which also means the global
 * prefers-reduced-motion rule covers them.
 */
const SplashScreen = () => (
  <div
    role="status"
    aria-label="Loading StockSense"
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-surface-950"
  >
    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 shadow-lg">
      <CandlestickChart size={26} className="text-white" strokeWidth={2.25} aria-hidden="true" />
    </div>

    <h1 className="mt-5 text-xl font-semibold tracking-tight text-gray-100">
      StockSense
    </h1>
    <p className="mt-1 text-2xs font-medium uppercase tracking-[0.2em] text-gray-600">
      AI Terminal
    </p>

    <div className="mt-6 w-40 h-0.5 rounded-full bg-surface-800 overflow-hidden">
      <div className="h-full rounded-full bg-brand-400 animate-splash-load" />
    </div>
  </div>
);

export default SplashScreen;
