import { waitlistUrl } from "../lib/links";

export default function Navbar() {
return (
<header className="sticky top-0 z-50 border-b border-white/10 bg-[#050807]/80 backdrop-blur-xl">
<nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
<a href="#" className="flex items-center gap-3">
<img
src="/logo.png"
alt="SchedNest logo"
className="h-10 w-10 object-contain brightness-0 invert"
/>

<span className="text-xl font-semibold tracking-tight text-white">
SchedNest
</span>
</a>

<div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
<a href="#features" className="transition hover:text-white">
Features
</a>

<a href="#workflow" className="transition hover:text-white">
How it works
</a>

<a href="#industries" className="transition hover:text-white">
Industries
</a>

<a href="#pricing" className="transition hover:text-white">
Pricing
</a>
</div>

<a
href={waitlistUrl}
target="_blank"
rel="noopener noreferrer"
className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
>
Join Waitlist
</a>
</nav>
</header>
);
}
