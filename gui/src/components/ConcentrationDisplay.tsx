import type { ConcentrationDisplayProps } from '../types';
import { getConcentrationColor } from '../utils/colors';

export default function ConcentrationDisplay({ concentration, isLearningMode }: ConcentrationDisplayProps) {
    if (!isLearningMode) {
        return (
            <div className="mt-4 text-center p-4 rounded-xl bg-gray-800 border border-gray-700">
                <p className="text-gray-400 font-semibold">Włącz tryb nauki, aby rozpocząć monitorowanie skupienia.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="text-gray-300 text-center mb-2 text-sm">Aktualny Poziom Skupienia</div>

            <div
                className="text-4xl font-extrabold text-center mb-4 transition-colors duration-500"
                style={{ color: getConcentrationColor(concentration) }}
            >
                {concentration.toFixed(0)} %
            </div>
            <p className="text-gray-500 text-xs">Dane przesyłane z silnika analitycznego.</p>
        </div>
    );
}