import type { GlassPanelProps } from '../types';

export default function GlassPanel({ children }: GlassPanelProps) {
    return (
        <div className="w-full h-full bg-[#161b22]/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl transition-all duration-300">
            {children}
        </div>
    );
}
