import { RiMailLine } from "react-icons/ri";

export default function ContactHero() {
  return (
    <section className="section bg-surface">
      <div className="container text-center s-lg">
        <span className="badge badge-primary kicker inline-flex items-center gap-2 mx-auto">
          <RiMailLine className="text-base" />
          Contact Us
        </span>

        <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-800 text-4xl sm:text-5xl lg:text-6xl">
          Let&apos;s Start a <br className="hidden md:block" />
          <span className="text-amber-400">Conversation</span>
        </h1>

        <p className="text-muted max-w-2xl mx-auto">
          Have a question about bookings, long stays, or corporate tie-ups? Our
          team is here to help you every step of the way.
        </p>
      </div>
    </section>
  );
}
