type ToggleProps = {
	enabled: boolean;
	onChange: (value: boolean) => void;
};

export default function Toggle({ enabled, onChange }: ToggleProps) {
	return (
		<button
			onClick={() => onChange(!enabled)}
			className={`
        relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300
        ${enabled ? "bg-teal-500" : "bg-gray-600"}
      `}
		>
			<span
				className={`
          inline-block h-6 w-6 rounded-full bg-white shadow transform transition-all duration-300
          ${enabled ? "translate-x-7" : "translate-x-1"}
        `}
			/>
		</button>
	);
}
