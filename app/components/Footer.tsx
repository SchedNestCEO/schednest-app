export default function Footer() {
return (
<footer className="border-t border-white/10 px-6 py-10">
<div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
<p>© 2026 SchedNest, LLC. All rights reserved.</p>

<div className="flex flex-wrap gap-5">
<a href="/privacy" className="transition hover:text-white">
Privacy Policy
</a>

<a href="/terms" className="transition hover:text-white">
Terms of Service
</a>

<a href="/contact" className="transition hover:text-white">
Contact
</a>

<a href="/login" className="transition hover:text-white">
Log In
</a>

<a href="/signup" className="transition hover:text-white">
Create Account
</a>
</div>
</div>
</footer>
);
}
