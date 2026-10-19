import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCw,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

type RatingKey =
  | "venueRating"
  | "staffRating"
  | "cleanlinessRating"
  | "crowdingRating";
type RatingForm = Record<RatingKey, string>;
type SavedReview = {
  venueRating: number;
  staffRating: number;
  cleanlinessRating: number;
  crowdingRating: number;
  body: string;
};

const ratingFields: Array<{ key: RatingKey; label: string; helper: string }> = [
  { key: "venueRating", label: "Venue", helper: "Equipment and overall space" },
  { key: "staffRating", label: "Staff", helper: "Welcome and helpfulness" },
  { key: "cleanlinessRating", label: "Cleanliness", helper: "Care and upkeep" },
  { key: "crowdingRating", label: "Crowding", helper: "Room to move" },
];

const initialRatings: RatingForm = {
  venueRating: "",
  staffRating: "",
  cleanlinessRating: "",
  crowdingRating: "",
};

function formatFee(
  feeMin: number | null | undefined,
  feeMax: number | null | undefined,
  currencyCode: string | null | undefined
) {
  if (feeMin == null && feeMax == null) return "Fee not provided";
  const currency = currencyCode?.trim();
  if (!currency) return "Fee listed without currency";
  const value = (amount: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      amount
    );
  if (feeMin != null && feeMax != null && feeMin !== feeMax)
    return `${value(feeMin)}–${value(feeMax)} ${currency}`;
  return `${value(feeMin ?? feeMax ?? 0)} ${currency}`;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function categoryLabel(category: string | null | undefined) {
  return category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "Movement space";
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function RatingStars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= value ? "fill-[#9abb50] text-[#799842] dark:fill-[#c8f06c] dark:text-[#c8f06c]" : "text-[#c8d2c4] dark:text-[#526858]"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ScoreDetail({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-[#dfe7d9] bg-[#f8faf5] p-4 dark:border-[#3b5241] dark:bg-[#263b2d]">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#728074] dark:text-[#adc0ae]">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="font-[Manrope,sans-serif] text-2xl font-semibold tracking-[-0.04em]">
          {value != null ? value.toFixed(1) : "Not rated yet"}
        </p>
        {value != null && <RatingStars value={Math.round(value)} />}
      </div>
    </div>
  );
}

export default function FacilityDetailsPage() {
  const [, params] = useRoute<{ id: string }>("/app/facilities/:id");
  const id = params?.id;
  const facilityId = id ? Number(id) : 0;
  const hasFacilityId = Number.isInteger(facilityId) && facilityId > 0;
  const memberQuery = trpc.auth.me.useQuery();
  const ownReviewQuery = trpc.member.reviews.myReview.useQuery(
    { facilityId: hasFacilityId ? facilityId : 0 },
    { enabled: false }
  );
  const favoriteQuery = trpc.member.favorites.isSaved.useQuery(
    { facilityId: hasFacilityId ? facilityId : 0 },
    { enabled: hasFacilityId && Boolean(memberQuery.data) }
  );
  const detailsQuery = trpc.marketplace.getById.useQuery(
    { id: hasFacilityId ? facilityId : 0 },
    { enabled: hasFacilityId }
  );
  const utils = trpc.useUtils();
  const isFavorite = favoriteQuery.data ?? false;
  const currentReviewKey =
    hasFacilityId && memberQuery.data
      ? `${facilityId}:${memberQuery.data.id}`
      : null;
  const [ratings, setRatings] = useState<RatingForm>(initialRatings);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadedReview, setLoadedReview] = useState<{
    key: string;
    review: SavedReview | null;
    error: boolean;
  } | null>(null);
  const [hydratedReviewKey, setHydratedReviewKey] = useState<string | null>(null);

  useEffect(() => {
    setRatings(initialRatings);
    setBody("");
    setFormError(null);
    setLoadedReview(null);
    setHydratedReviewKey(null);
    if (!currentReviewKey) return;

    let active = true;
    void ownReviewQuery.refetch().then(result => {
      if (!active) return;
      setLoadedReview({
        key: currentReviewKey,
        review: result.isError ? null : result.data ?? null,
        error: result.isError,
      });
    });
    return () => {
      active = false;
    };
  }, [currentReviewKey, ownReviewQuery.refetch]);

  useEffect(() => {
    if (!currentReviewKey || loadedReview?.key !== currentReviewKey) return;
    const saved = loadedReview.review;
    setRatings(
      saved
        ? {
            venueRating: String(saved.venueRating),
            staffRating: String(saved.staffRating),
            cleanlinessRating: String(saved.cleanlinessRating),
            crowdingRating: String(saved.crowdingRating),
          }
        : initialRatings
    );
    setBody(saved?.body ?? "");
    setHydratedReviewKey(currentReviewKey);
  }, [currentReviewKey, loadedReview]);

  const reviewFormReady =
    currentReviewKey !== null &&
    loadedReview?.key === currentReviewKey &&
    hydratedReviewKey === currentReviewKey;
  const hasSavedReview = reviewFormReady && Boolean(loadedReview?.review);

  const addFavorite = trpc.member.favorites.add.useMutation({
    onSuccess: async () => {
      toast.success("Saved to your favorites.");
      if (hasFacilityId) {
        await utils.member.favorites.isSaved.invalidate({ facilityId });
        await utils.marketplace.getById.invalidate({ id: facilityId });
      }
    },
    onError: () =>
      toast.error("We could not save this space. Please try again."),
  });
  const removeFavorite = trpc.member.favorites.remove.useMutation({
    onSuccess: async () => {
      toast.success("Removed from your favorites.");
      if (hasFacilityId) {
        await utils.member.favorites.isSaved.invalidate({ facilityId });
        await utils.marketplace.getById.invalidate({ id: facilityId });
      }
    },
    onError: () =>
      toast.error("We could not update your favorites. Please try again."),
  });
  const reviewMutation = trpc.member.reviews.upsert.useMutation({
    onSuccess: async savedReview => {
      toast.success("Your review was saved.");
      setFormError(null);
      if (currentReviewKey) {
        setLoadedReview({
          key: currentReviewKey,
          review: savedReview ?? null,
          error: false,
        });
        setHydratedReviewKey(currentReviewKey);
      }
      if (hasFacilityId) {
        await detailsQuery.refetch();
        await utils.marketplace.getById.invalidate({ id: facilityId });
      }
    },
    onError: () => {
      setFormError("Your review could not be saved. Please try again.");
      toast.error("Your review could not be saved.");
    },
  });

  const details = detailsQuery.data;
  const facility =
    details && "facility" in details ? details.facility : details;
  const reviews = details?.reviews ?? [];
  const scoreDetails = useMemo(() => {
    return ratingFields.map(({ key, label }) => ({
      label,
      value: average(
        reviews
          .map(review => review[key])
          .filter((value): value is number => typeof value === "number")
      ),
    }));
  }, [reviews]);

  const signIn = () => {
    try {
      startLogin();
    } catch {
      toast.error("Sign in is not configured for this environment.");
    }
  };

  const toggleFavorite = () => {
    if (!memberQuery.data) {
      signIn();
      return;
    }
    if (!hasFacilityId) return;
    if (isFavorite) {
      removeFavorite.mutate({ facilityId });
    } else {
      addFavorite.mutate({ facilityId });
    }
  };

  const updateRating = (key: RatingKey, value: string) => {
    setRatings(current => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const submitReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberQuery.data) {
      signIn();
      return;
    }
    if (!hasFacilityId) return;

    const parsedRatings = Object.fromEntries(
      ratingFields.map(({ key }) => [key, Number(ratings[key])])
    ) as Record<RatingKey, number>;
    const hasInvalidRating = ratingFields.some(
      ({ key }) =>
        !Number.isInteger(parsedRatings[key]) ||
        parsedRatings[key] < 1 ||
        parsedRatings[key] > 5
    );
    if (hasInvalidRating) {
      setFormError("Please choose a score from 1 to 5 for every category.");
      toast.error("Please complete all four scores.");
      return;
    }
    if (!body.trim()) {
      setFormError(
        "Please share a little about your experience before saving."
      );
      toast.error("Review text is required.");
      return;
    }

    reviewMutation.mutate({
      facilityId,
      ...parsedRatings,
      body: body.trim(),
    });
  };

  if (!id) {
    return (
      <main className="min-h-screen bg-[#f4f6ef] p-6 text-[#1d2520] dark:bg-[#17231d] dark:text-[#eef4ea]">
        <EmptyDetailsState
          title="This space could not be found"
          description="The facility link is missing an identifier."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6ef] text-[#1d2520] dark:bg-[#17231d] dark:text-[#eef4ea]">
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#55783e] transition hover:text-[#36552f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9acb52] dark:text-[#c8f06c] dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        {detailsQuery.isPending ? (
          <div
            className="mt-8 space-y-5"
            aria-label="Loading facility details"
            aria-busy="true"
          >
            <div className="h-72 animate-pulse rounded-2xl bg-white/70 dark:bg-[#203128]" />
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="h-56 animate-pulse rounded-2xl bg-white/70 dark:bg-[#203128]" />
              <div className="h-56 animate-pulse rounded-2xl bg-white/70 dark:bg-[#203128] lg:col-span-2" />
            </div>
          </div>
        ) : detailsQuery.isError ? (
          <section
            className="mt-8 rounded-2xl border border-[#e4cfc3] bg-[#fffaf7] p-8 dark:border-[#60463c] dark:bg-[#2b211e]"
            role="alert"
          >
            <AlertCircle className="h-7 w-7 text-[#a05e42] dark:text-[#eaa27e]" />
            <h1 className="mt-4 font-[Manrope,sans-serif] text-2xl font-semibold">
              Facility details could not be loaded
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#756c66] dark:text-[#cbb6ab]">
              Please try again to view this published space.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => detailsQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </section>
        ) : !facility ? (
          <EmptyDetailsState
            title="This space is not available"
            description="It may no longer be published, or the link may be incorrect."
          />
        ) : (
          <>
            <section className="mt-7 rounded-2xl border border-[#dfe4db] bg-[#23382f] p-6 text-[#f4f6ef] shadow-[0_20px_70px_rgba(35,56,47,0.15)] dark:border-[#3a5643] dark:bg-[#203128] sm:p-8 lg:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c8f06c]">
                    {categoryLabel(facility.category)}
                  </p>
                  <h1 className="mt-3 font-[Manrope,sans-serif] text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                    {facility.name}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#d0ddd0]">
                    {facility.description || "Description not provided."}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#d0ddd0]">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#c8f06c]" />
                      {[facility.area, facility.city]
                        .filter(Boolean)
                        .join(", ") || "Location not provided"}
                    </span>
                    {facility.address && (
                      <span className="inline-flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-[#c8f06c]" />
                        {facility.address}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[#9ab77d] bg-transparent text-[#f4f6ef] hover:bg-[#344d3d] hover:text-white dark:border-[#718e67] sm:w-auto"
                  onClick={toggleFavorite}
                  disabled={addFavorite.isPending || removeFavorite.isPending}
                >
                  {addFavorite.isPending || removeFavorite.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`h-4 w-4 ${isFavorite ? "fill-[#c8f06c] text-[#c8f06c]" : ""}`}
                    />
                  )}
                  {isFavorite ? "Saved" : "Save space"}
                </Button>
              </div>
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <section
                className="rounded-2xl border border-[#dfe4db] bg-white/80 p-6 dark:border-[#34483b] dark:bg-[#203128]"
                aria-labelledby="score-heading"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718276] dark:text-[#abc1ab]">
                      Community signal
                    </p>
                    <h2
                      id="score-heading"
                      className="mt-2 font-[Manrope,sans-serif] text-xl font-semibold tracking-[-0.045em]"
                    >
                      TasseiScore
                    </h2>
                  </div>
                  <Star className="h-5 w-5 text-[#8cae4c] dark:text-[#c8f06c]" />
                </div>
                {facility.tasseiScore != null ? (
                  <>
                    <p className="mt-6 font-[Manrope,sans-serif] text-5xl font-semibold tracking-[-0.07em] text-[#567c36] dark:text-[#c8f06c]">
                      {facility.tasseiScore.toFixed(1)}
                    </p>
                    <p className="mt-2 text-sm text-[#718077] dark:text-[#b0c1b1]">
                      Based on {facility.reviewCount}{" "}
                      {facility.reviewCount === 1
                        ? "public review"
                        : "public reviews"}
                      .
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-6 font-[Manrope,sans-serif] text-2xl font-semibold tracking-[-0.05em]">
                      Not rated yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#718077] dark:text-[#b0c1b1]">
                      A score will appear when this space has published
                      community ratings.
                    </p>
                  </>
                )}
                <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {scoreDetails.map(item => (
                    <ScoreDetail
                      key={item.label}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </section>

              <section
                className="rounded-2xl border border-[#dfe4db] bg-white/80 p-6 dark:border-[#34483b] dark:bg-[#203128] lg:col-span-2"
                aria-labelledby="visit-heading"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718276] dark:text-[#abc1ab]">
                      Plan your visit
                    </p>
                    <h2
                      id="visit-heading"
                      className="mt-2 font-[Manrope,sans-serif] text-xl font-semibold tracking-[-0.045em]"
                    >
                      What this space lists
                    </h2>
                  </div>
                  <MapPin className="h-5 w-5 text-[#719146] dark:text-[#c8f06c]" />
                </div>
                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-[#849087] dark:text-[#9eb2a0]">
                      Fee
                    </dt>
                    <dd className="mt-1 text-lg font-semibold">
                      {formatFee(
                        facility.feeMin,
                        facility.feeMax,
                        facility.currencyCode
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-[#849087] dark:text-[#9eb2a0]">
                      Address
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {facility.address || "Address not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-[#849087] dark:text-[#9eb2a0]">
                      City / area
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {[facility.city, facility.area]
                        .filter(Boolean)
                        .join(" · ") || "Location not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-[#849087] dark:text-[#9eb2a0]">
                      Coordinates
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {facility.latitude != null && facility.longitude != null
                        ? `${facility.latitude.toFixed(4)}, ${facility.longitude.toFixed(4)}`
                        : "Not provided"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-7 flex items-start gap-2 border-t border-[#e3e8df] pt-5 text-xs leading-5 text-[#758279] dark:border-[#35493c] dark:text-[#a9b9aa]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#739846] dark:text-[#c8f06c]" />
                  Fees, location, and details are owner-entered. TasseiGō does
                  not imply review verification.
                </p>
              </section>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
              <section
                className="rounded-2xl border border-[#dfe4db] bg-white/80 p-6 dark:border-[#34483b] dark:bg-[#203128]"
                aria-labelledby="reviews-heading"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718276] dark:text-[#abc1ab]">
                      Member notes
                    </p>
                    <h2
                      id="reviews-heading"
                      className="mt-2 font-[Manrope,sans-serif] text-xl font-semibold tracking-[-0.045em]"
                    >
                      Public reviews
                    </h2>
                  </div>
                  <MessageCircle className="h-5 w-5 text-[#719146] dark:text-[#c8f06c]" />
                </div>
                {reviews.length === 0 ? (
                  <div className="mt-8 rounded-xl border border-dashed border-[#c8d4c3] bg-[#f6f9f1] p-6 text-center dark:border-[#506754] dark:bg-[#263b2d]">
                    <MessageCircle className="mx-auto h-7 w-7 text-[#83a260] dark:text-[#c8f06c]" />
                    <p className="mt-3 font-semibold">Not rated yet</p>
                    <p className="mt-1 text-sm leading-6 text-[#748077] dark:text-[#b1c1b2]">
                      There are no public reviews for this space yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {reviews.map((review, index) => (
                      <article
                        key={`${review.createdAt ?? "review"}-${index}`}
                        className="rounded-xl border border-[#e1e7df] p-4 dark:border-[#3b5241]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">TasseiGō member</p>
                            <p className="mt-1 text-xs text-[#849087] dark:text-[#9eb2a0]">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <RatingStars
                              value={Math.round(
                                (review.venueRating +
                                  review.staffRating +
                                  review.cleanlinessRating +
                                  review.crowdingRating) /
                                  4
                              )}
                            />
                            <span className="text-xs text-[#748077] dark:text-[#b1c1b2]">
                              Overall
                            </span>
                          </div>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#536257] dark:text-[#c2d0c2]">
                          {review.body}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e8ece6] pt-3 text-xs dark:border-[#35493c] sm:grid-cols-4">
                          {ratingFields.map(({ key, label }) => (
                            <div key={key}>
                              <p className="text-[#849087] dark:text-[#9eb2a0]">
                                {label}
                              </p>
                              <p className="mt-1 font-semibold">
                                {review[key]}/5
                              </p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="rounded-2xl border border-[#dfe4db] bg-[#edf3df]/75 p-6 dark:border-[#405746] dark:bg-[#243b2c]"
                aria-labelledby="review-form-heading"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#668c3b] dark:text-[#c8f06c]">
                    Your perspective
                  </p>
                  <h2
                    id="review-form-heading"
                    className="mt-2 font-[Manrope,sans-serif] text-xl font-semibold tracking-[-0.045em]"
                  >
                    {hasSavedReview ? "Update your review" : "Submit your review"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68756b] dark:text-[#b7c7b6]">
                    {hasSavedReview
                      ? "Your current review is prefilled. Edit the scores or text, then save your changes."
                      : "One structured review per space. You can update it any time after signing in."}
                  </p>
                </div>
                {!memberQuery.data ? (
                  <div className="mt-7 rounded-xl border border-[#c8d8bf] bg-white/65 p-5 dark:border-[#536c57] dark:bg-[#1d3024]">
                    <p className="text-sm leading-6 text-[#5d6e60] dark:text-[#bfd0bd]">
                      Sign in to save this space and share your own four-part
                      review.
                    </p>
                    <Button
                      type="button"
                      className="mt-4 bg-[#1d2520] text-[#f4f6ef] hover:bg-[#39533e] dark:bg-[#c8f06c] dark:text-[#1d2520] dark:hover:bg-[#d9f79e]"
                      onClick={signIn}
                    >
                      Sign in
                    </Button>
                  </div>
                ) : !reviewFormReady ? (
                  <div
                    className="mt-7 flex items-center gap-3 rounded-xl border border-[#c8d8bf] bg-white/65 p-5 text-sm text-[#5d6e60] dark:border-[#536c57] dark:bg-[#1d3024] dark:text-[#bfd0bd]"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Preparing your review form…
                  </div>
                ) : (
                  <form
                    className="mt-6 space-y-5"
                    onSubmit={submitReview}
                    noValidate
                  >
                    {loadedReview?.key === currentReviewKey && loadedReview.error && (
                      <p className="text-sm text-[#8b5a3b] dark:text-[#e7b28f]" role="alert">
                        We couldn’t load your existing review. You can still save a review, and the server will apply it only to your account.
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ratingFields.map(({ key, label, helper }) => (
                        <label key={key} className="space-y-2">
                          <span className="block text-sm font-semibold">
                            {label}
                            <span className="mt-0.5 block text-xs font-normal text-[#788579] dark:text-[#aabeaa]">
                              {helper}
                            </span>
                          </span>
                          <select
                            value={ratings[key]}
                            onChange={event =>
                              updateRating(key, event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-[#cbd9c4] bg-white/80 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#9acb52] dark:border-[#506954] dark:bg-[#1b3023]"
                            aria-label={`${label} score`}
                          >
                            <option value="">Choose 1–5</option>
                            {[1, 2, 3, 4, 5].map(value => (
                              <option key={value} value={value}>
                                {value} / 5
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="facility-review-body"
                        className="text-sm font-semibold"
                      >
                        Review text
                      </label>
                      <Textarea
                        id="facility-review-body"
                        value={body}
                        onChange={event => {
                          setBody(event.target.value);
                          setFormError(null);
                        }}
                        placeholder="What should another member know?"
                        rows={5}
                        className="resize-y border-[#cbd9c4] bg-white/80 dark:border-[#506954] dark:bg-[#1b3023]"
                      />
                    </div>
                    {formError && (
                      <p
                        className="text-sm font-medium text-[#a05e42] dark:text-[#f0a180]"
                        role="alert"
                      >
                        {formError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-[#1d2520] text-[#f4f6ef] hover:bg-[#39533e] dark:bg-[#c8f06c] dark:text-[#1d2520] dark:hover:bg-[#d9f79e]"
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {reviewMutation.isPending ? "Saving…" : "Save review"}
                    </Button>
                  </form>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function EmptyDetailsState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-[#bdcbb9] bg-[#edf3df]/65 p-10 text-center dark:border-[#536b58] dark:bg-[#22372a]">
      <AlertCircle className="mx-auto h-8 w-8 text-[#789a4d] dark:text-[#c8f06c]" />
      <h1 className="mt-4 font-[Manrope,sans-serif] text-xl font-semibold">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#6e7c70] dark:text-[#b6c7b5]">
        {description}
      </p>
      <Link
        href="/app"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#55783e] dark:text-[#c8f06c]"
      >
        Back to marketplace <ArrowLeft className="h-4 w-4 rotate-180" />
      </Link>
    </section>
  );
}
