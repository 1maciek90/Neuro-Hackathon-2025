import type { PropsWithChildren } from "react";

export default function GlassPanel({ children }: PropsWithChildren) {
	return (
		<div
			className="
        backdrop-blur-xl 
        bg-white/10
        border border-white/20
        shadow-xl
        rounded-2xl
        p-6
      "
		>
			{children}
		</div>
	);
}
