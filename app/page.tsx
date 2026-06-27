import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Industries from "./components/Industries";
import Pricing from "./components/Pricing";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
return (
<main className="relative min-h-screen overflow-hidden bg-[#050807] text-white">
<div className="pointer-events-none absolute inset-0">
<div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[170px]" />
<div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[180px]" />
</div>

<div className="relative z-10">
<Navbar />
<Hero />
<Features />
<HowItWorks />
<Industries />
<Pricing />
<FAQ />
<CTA />
<Footer />
</div>
</main>
);
}