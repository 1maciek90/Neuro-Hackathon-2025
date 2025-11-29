import { useState } from "react";
import GlassPanel from "./components/GlassPanel";
import Toggle from "./components/Toggle";

export default function App() {
	const [learningMode, setLearningMode] = useState(false);

	return (
		<div className="w-[340px] min-h-[260px] bg-[#0d1117] text-white p-6 font-sans">
			<GlassPanel>
				{/* Nagłówek */}
				<div className="flex items-center gap-2 mb-3">
					<div className="w-6 h-6 rounded-full bg-teal-400 flex items-center justify-center text-black font-bold">
						🧠
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-teal-300">BrainWave Focus</h1>
				</div>

				{/* Opis */}
				<p className="text-gray-300 leading-snug mb-6">
					Enhance your concentration while learning or watching YouTube. This extension analyzes your brainwave patterns
					and keeps you on track.
				</p>

				{/* Learning Mode */}
				<div className="flex justify-between items-center mb-4">
					<span className="text-lg font-medium">Learning Mode</span>
					<Toggle enabled={learningMode} onChange={(value) => setLearningMode(value)} />
				</div>

				{/* Status */}
				<p className={`text-sm font-medium ${learningMode ? "text-green-400" : "text-red-400"}`}>
					{learningMode
						? "🟢 Learning mode is ON — YouTube focus control activated."
						: "🔴 Learning mode is OFF — no focus monitoring."}
				</p>
			</GlassPanel>
		</div>
	);
}
