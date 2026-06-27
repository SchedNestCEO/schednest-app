export default function Footer() {
return (
<footer className="border-t border-white/10 px-6 py-10">
<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm text-gray-400 sm:flex-row sm:text-left">
<div className="flex items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-transparent">
<img
src="/logo.png"
alt="SchedNest logo"
className="h-10 w-10 scale-125 object-contain brightness-0 invert"
/>
</div>

<span className="text-base font-semibold text-white">SchedNest</span>
</div>

<p>© 2026 SchedNest. All rights reserved.</p>
</div>
</footer>
);
}