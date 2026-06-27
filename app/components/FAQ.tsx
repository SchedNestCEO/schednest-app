const faqs = [
{
question: "Who is SchedNest for?",
answer:
"SchedNest is built for time-based businesses that rely on bookings, customers, reminders, and organized daily operations.",
},
{
question: "Who is Birdy?",
answer:
"Birdy is the AI operations assistant built into SchedNest. Birdy helps monitor bookings, customers, reminders, and daily priorities so business owners know what needs attention next.",
},
{
question: "Is SchedNest available yet?",
answer:
"SchedNest is currently in development. Founding Members will receive early access before public launch.",
},
{
question: "Do I need a credit card to join?",
answer: "No. Joining the waitlist does not require a credit card.",
},
{
question: "Can SchedNest grow with my business?",
answer:
"Yes. SchedNest is designed to support solo professionals today and growing teams over time.",
},
];

export default function FAQ() {
return (
<section id="faq" className="mx-auto w-full max-w-4xl px-6 py-28">
<div className="text-center">
<h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
Questions before launch?
</h2>
</div>

<div className="mt-12 space-y-4">
{faqs.map((faq) => (
<div
key={faq.question}
className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
>
<h3 className="font-bold">{faq.question}</h3>
<p className="mt-3 leading-7 text-gray-300">{faq.answer}</p>
</div>
))}
</div>
</section>
);
}