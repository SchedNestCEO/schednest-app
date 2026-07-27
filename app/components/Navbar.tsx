import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
return (
<header className="sticky top-0 z-50 border-b border-white/10 bg-surface-dark/80 backdrop-blur-xl">
<nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
<Link href="/" className="flex items-center gap-3">
<Image
src="/logo.png"
alt="SchedNest logo"
width={40}
height={40}
className="h-10 w-10 object-contain brightness-0 invert"
/>

<span className="torogoz-wordmark text-xl font-black tracking-tight">
SchedNest
</span>
</Link>

<div className="hidden items-center gap-7 text-sm text-gray-300 lg:flex">
<Link href="/#features" className="transition hover:text-white">
Features
</Link>

<Link href="/#workflow" className="transition hover:text-white">
How it works
</Link>

<Link href="/#industries" className="transition hover:text-white">
Industries
</Link>

<Link href="/#pricing" className="transition hover:text-white">
Pricing
</Link>

<Link href="/contact" className="transition hover:text-white">
Contact
</Link>
</div>

<div className="flex items-center gap-2 sm:gap-3">
<Link
href="/login"
className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-white transition hover:bg-white hover:text-black sm:px-5 sm:text-sm"
>
Log In
</Link>

<Link
href="/signup"
className="rounded-full bg-edition-primary px-3 py-2 text-xs font-semibold text-black transition hover:bg-edition-primary-hover sm:px-5 sm:text-sm"
>
Sign Up
</Link>
</div>
</nav>
</header>
);
}
