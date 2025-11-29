import { useEffect, useState } from "react";
import GlassPanel from "./components/GlassPanel";
import Toggle from "./components/Toggle";
import { getConcentrationColor } from "./utils/colors";

export default function App() {
	const [learningMode, setLearningMode] = useState(false);
	const [averageConcentration, setAverageConcentration] = useState(100);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				if (typeof chrome !== "undefined" && chrome.storage) {
					chrome.storage.local.get("learningMode", (data) => {
						if (data && data.learningMode !== undefined) {
							setLearningMode(!!data.learningMode);
						}
						setIsLoading(false);
					});
				} else {
					// Fallback dla środowiska deweloperskiego
					setIsLoading(false);
				}
			} catch (e) {
				console.warn("chrome.storage not available", e);
				setIsLoading(false);
			}
		};

		loadData();
	}, []);

	const handleLearningModeChange = (value: boolean) => {
		setLearningMode(value);
		try {
			chrome.storage.local.set({ learningMode: value });
		} catch (e) {
			console.warn("Failed to save to chrome.storage", e);
		}
	};

	if (isLoading) {
		return (
			<div className="flex w-[340px] min-h-[260px] bg-[#0d1117] text-white p-6 font-sans items-center justify-center">
				<div className="text-gray-400">Loading...</div>
			</div>
		);
	}

	return (
		<div className="flex w-[340px] min-h-[260px] bg-[#0d1117] text-white p-6 font-sans">
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

				{learningMode ? (
					<div className="flex flex-col items-center justify-center">
						<div className="text-gray-300 text-center mb-2 text-sm">Current Focus Level</div>

						<div
							className="text-2xl font-bold text-center mb-4"
							style={{ color: getConcentrationColor(averageConcentration) }}
						>
							{averageConcentration} %
						</div>

						<button
							onClick={() => setAverageConcentration(averageConcentration - 10)}
							className="px-4 py-2 bg-teal-500 text-white rounded-xl mb-4"
						>
							-10%
						</button>
					</div>
				) : null}

				{/* Learning Mode */}
				<div className="flex justify-between items-center mb-4">
					<span className="text-lg font-medium">Learning Mode</span>
					<Toggle enabled={learningMode} onChange={(value) => handleLearningModeChange(value)} />
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
