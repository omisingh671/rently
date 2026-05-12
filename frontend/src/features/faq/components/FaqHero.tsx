import { RiQuestionLine } from "react-icons/ri";

export default function FaqHero() {
  return (
    <section className="section">
      <div className="container text-center s-lg">
        <span className="badge badge-primary kicker inline-flex items-center gap-2 mx-auto">
          <RiQuestionLine className="text-base" />
          Get Answers
        </span>

        <h1 className="mt-6 font-heading font-extrabold leading-tight text-slate-700 text-4xl sm:text-5xl lg:text-6xl">
          Frequently Asked <span className="text-amber-400">Questions</span>
        </h1>

        <p className="text-sm sm:text-base text-muted mt-5 leading-relaxed">
          Find answers to common questions about check-in, amenities, policies,
          and more.
        </p>
      </div>
    </section>
  );
}
