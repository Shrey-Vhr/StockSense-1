import { Activity } from 'lucide-react';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-[#0d1117] flex flex-col items-center justify-center z-[100]">
      <div className="relative">
        <Activity size={64} className="text-[#f0b429] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#f0b429]/10 rounded-full animate-ping" />
      </div>
      
      <h1 className="mt-8 text-3xl font-bold text-white tracking-wider">
        STOCK<span className="text-[#f0b429]">SENSE</span>
      </h1>
      
      <div className="mt-4 text-gray-400 font-mono text-sm overflow-hidden whitespace-nowrap border-r-2 border-[#f0b429] animate-[typing_2s_steps(30,end),blink_0.5s_step-end_infinite]">
        Analyzing the market...
      </div>
      
      <div className="mt-8 w-48 h-1 bg-[#161b22] rounded-full overflow-hidden">
        <div className="h-full bg-[#f0b429] animate-[load_2s_ease-in-out_forwards]" />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes typing { from { width: 0 } to { width: 170px } }
        @keyframes blink { 50% { border-color: transparent } }
        @keyframes load { 0% { width: 0% } 100% { width: 100% } }
      `}} />
    </div>
  );
};

export default SplashScreen;
