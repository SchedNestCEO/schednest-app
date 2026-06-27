import type { ReactNode } from "react";

type ScrollPanelProps = {
children: ReactNode;
className?: string;
};

export default function ScrollPanel({
children,
className = "",
}: ScrollPanelProps) {
return (
<section className={`relative min-h-[115vh] ${className}`}>
<div className="sticky top-20 flex min-h-[calc(100vh-80px)] items-center">
<div className="w-full">{children}</div>
</div>
</section>
);
}
