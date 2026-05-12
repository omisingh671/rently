import { RiDoubleQuotesL, RiUser3Line, RiUserSmileLine } from "react-icons/ri";
import ReactSlide from "@/components/ui/ReactSlide/ReactSlide";

type Gender = "male" | "female";

type Review = {
  text: string;
  gender?: Gender;
  name?: string;
  role?: string;
  rating?: number;
};

const REVIEWS: Review[] = [
  {
    text: "Much better than a hotel. Clean, homely, and extremely convenient.",
    gender: "male",
    name: "Rahul Mehta",
    role: "Corporate Guest · Long Stay",
    rating: 5,
  },
  {
    text: "Perfect for long stays — Wi-Fi and housekeeping made life easy.",
    gender: "female",
    role: "IT Professional · Monthly Stay",
  },
  {
    text: "The apartment felt safe, quiet, and very comfortable.",
    rating: 5,
  },
];

function ReviewCard({ review }: { review: Review }) {
  const AvatarIcon =
    review.gender === "female"
      ? RiUserSmileLine
      : review.gender === "male"
      ? RiUser3Line
      : null;

  return (
    <div className="h-full rounded-2xl bg-surface1 px-8 py-10 shadow-sm hover:shadow-lg transition-all border border-default/10">
      {/* Quote */}
      <RiDoubleQuotesL className="text-5xl text-warning/25 mb-6" />

      {/* Review Text */}
      <p className="text-lg md:text-xl font-medium text-default leading-relaxed mb-10">
        {review.text}
      </p>

      {/* Identity Row */}
      {(AvatarIcon || review.name || review.role) && (
        <div className="flex items-center gap-4">
          {AvatarIcon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AvatarIcon className="text-xl" />
            </div>
          )}

          <div className="flex flex-col leading-tight">
            {review.name && (
              <span className="text-sm font-semibold text-default">
                {review.name}
              </span>
            )}
            {review.role && (
              <span className="text-xs text-muted">{review.role}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Reviews = () => {
  return (
    <section className="bg-surface-1 section">
      <div className="container">
        <ReactSlide
          title={
            <h2 className="heading heading-lg text-slate-700">
              What Our Guests Say
            </h2>
          }
          items={REVIEWS}
          renderItem={(review) => <ReviewCard review={review} />}
          slidesToShow={3.5}
          gap={24}
          responsive={[
            { breakpoint: 1024, slidesToShow: 2.5 },
            { breakpoint: 768, slidesToShow: 2 },
            { breakpoint: 0, slidesToShow: 1 },
          ]}
          alignNavButtons="topRight"
          showDots={true}
          showNavOnHover={false}
        />
      </div>
    </section>
  );
};

export default Reviews;
