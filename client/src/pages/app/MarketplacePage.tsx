import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  Dumbbell,
  LocateFixed,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type Category = "gym" | "yoga" | "pool" | "wellness";
type Coordinates = { latitude: number; longitude: number };

const categoryOptions: Array<{
  value: Category;
  label: string;
  icon: typeof Dumbbell;
}> = [
  { value: "gym", label: "Gym", icon: Dumbbell },
  { value: "yoga", label: "Yoga", icon: Sparkles },
  { value: "pool", label: "Pool", icon: Waves },
  { value: "wellness", label: "Wellness", icon: Sparkles },
];

function parseFee(value: string) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
}

function formatFee(
  feeMin: number | null | undefined,
  feeMax: number | null | undefined,
  currencyCode: string | null | undefined
) {
  if (feeMin == null && feeMax == null) return "Fee not provided";
  const currency = currencyCode?.trim();
  if (!currency) return "Fee listed without currency";

  const formatValue = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      value
    );

  if (feeMin != null && feeMax != null && feeMin !== feeMax) {
    return `${formatValue(feeMin)}–${formatValue(feeMax)} ${currency}`;
  }
  return `${formatValue(feeMin ?? feeMax ?? 0)} ${currency}`;
}

function categoryLabel(category: string | null | undefined) {
  return category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "Movement space";
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase tracking-[0.12em] text-[#68756b] dark:text-[#b0c1b2]"
    >
      {children}
    </label>
  );
}

export default function MarketplacePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [city, setCity] = useState("");
  const [minFee, setMinFee] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>();
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const normalizedCurrency = currencyCode.trim().toUpperCase();
  const hasValidCurrency = /^[A-Z]{3}$/.test(normalizedCurrency);
  const parsedMinFee = parseFee(minFee);
  const parsedMaxFee = parseFee(maxFee);
  const feeRangeReversed =
    parsedMinFee !== undefined &&
    parsedMaxFee !== undefined &&
    parsedMinFee > parsedMaxFee;
  const hasFeeBounds = minFee.trim() !== "" || maxFee.trim() !== "";
  const feeFilterMessage = feeRangeReversed
    ? "Minimum fee must not exceed maximum fee."
    : hasFeeBounds && !hasValidCurrency
      ? "Enter a three-letter currency code to apply fee filters."
      : currencyCode.trim() !== "" && !hasValidCurrency
        ? "Use a three-letter currency code, or clear the currency field."
        : null;

  const searchInput = useMemo(
    () => ({
      q: q.trim() || undefined,
      category: category || undefined,
      city: city.trim() || undefined,
      minFee: hasValidCurrency && !feeRangeReversed ? parsedMinFee : undefined,
      maxFee: hasValidCurrency && !feeRangeReversed ? parsedMaxFee : undefined,
      currencyCode: hasValidCurrency ? normalizedCurrency : undefined,
      near: coordinates,
    }),
    [category, city, coordinates, feeRangeReversed, hasValidCurrency, normalizedCurrency, parsedMaxFee, parsedMinFee, q]
  );
  const searchQuery = trpc.marketplace.search.useQuery(searchInput);
  const facilities = searchQuery.data ?? [];

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is not available in this browser. You can still search by name, area, or city."
      );
      return;
    }

    setIsLocating(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords: nextCoordinates }) => {
        setCoordinates({
          latitude: nextCoordinates.latitude,
          longitude: nextCoordinates.longitude,
        });
        setLocationMessage("Using your location for this search only.");
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocationMessage(
          "We could not access your location. You can still search by name, area, or city."
        );
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 }
    );
  };

  const clearFilters = () => {
    setQ("");
    setCategory("");
    setCity("");
    setMinFee("");
    setMaxFee("");
    setCurrencyCode("");
    setCoordinates(undefined);
    setLocationMessage(null);
  };

  return (
    <main className="min-h-screen bg-[#f4f6ef] text-[#1d2520] dark:bg-[#17231d] dark:text-[#eef4ea]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-8 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#668c3b] dark:text-[#c8f06c]">
            <span className="h-2 w-2 rounded-full bg-[#c8f06c] shadow-[0_0_0_4px_rgba(200,240,108,0.18)]" />
            Member marketplace
          </div>
          <h1 className="font-[Manrope,sans-serif] text-4xl font-semibold tracking-[-0.055em] text-[#1d2520] dark:text-[#f4f8f2] sm:text-5xl">
            Find a place that fits your routine.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#667269] dark:text-[#b3c0b3]">
            Browse published gyms, yoga studios, pools, and wellness spaces.
            Fees and scores are shown exactly as owners provide them.
          </p>
        </header>

        <section
          className="rounded-2xl border border-[#dfe4db] bg-white/70 p-4 shadow-[0_18px_60px_rgba(35,56,47,0.06)] dark:border-[#34483b] dark:bg-[#203128]/85 sm:p-6"
          aria-labelledby="search-heading"
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="search-heading"
                className="font-[Manrope,sans-serif] text-lg font-semibold tracking-[-0.04em]"
              >
                Search spaces
              </h2>
              <p className="mt-1 text-sm text-[#748077] dark:text-[#a6b7a8]">
                Start with a name, area, or city, then narrow the results.
              </p>
            </div>
            {(q ||
              category ||
              city ||
              minFee ||
              maxFee ||
              currencyCode ||
              coordinates) && (
              <Button
                type="button"
                variant="ghost"
                className="text-[#47613c] dark:text-[#c8f06c]"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]">
            <div className="space-y-2 lg:col-span-1">
              <FieldLabel htmlFor="marketplace-query">Search</FieldLabel>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#758178]"
                  aria-hidden="true"
                />
                <Input
                  id="marketplace-query"
                  value={q}
                  onChange={event => setQ(event.target.value)}
                  placeholder="Name or area"
                  className="h-11 border-[#d7dfd3] bg-[#fbfcf8] pl-10 dark:border-[#425749] dark:bg-[#17251d]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="marketplace-city">City</FieldLabel>
              <Input
                id="marketplace-city"
                value={city}
                onChange={event => setCity(event.target.value)}
                placeholder="e.g. Kyoto"
                className="h-11 border-[#d7dfd3] bg-[#fbfcf8] dark:border-[#425749] dark:bg-[#17251d]"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="marketplace-category">Type</FieldLabel>
              <select
                id="marketplace-category"
                value={category}
                onChange={event =>
                  setCategory(event.target.value as Category | "")
                }
                className="h-11 w-full rounded-md border border-[#d7dfd3] bg-[#fbfcf8] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#a5d84d] dark:border-[#425749] dark:bg-[#17251d] dark:text-[#eef4ea]"
              >
                <option value="">All types</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(150px,0.75fr)_auto] lg:items-end">
            <div className="space-y-2">
              <FieldLabel htmlFor="marketplace-min-fee">Minimum fee</FieldLabel>
              <Input
                id="marketplace-min-fee"
                type="number"
                min="0"
                inputMode="decimal"
                value={minFee}
                onChange={event => setMinFee(event.target.value)}
                placeholder="No minimum"
                className="h-11 border-[#d7dfd3] bg-[#fbfcf8] dark:border-[#425749] dark:bg-[#17251d]"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="marketplace-max-fee">Maximum fee</FieldLabel>
              <Input
                id="marketplace-max-fee"
                type="number"
                min="0"
                inputMode="decimal"
                value={maxFee}
                onChange={event => setMaxFee(event.target.value)}
                placeholder="No maximum"
                className="h-11 border-[#d7dfd3] bg-[#fbfcf8] dark:border-[#425749] dark:bg-[#17251d]"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="marketplace-currency">Currency</FieldLabel>
              <Input
                id="marketplace-currency"
                value={currencyCode}
                onChange={event => setCurrencyCode(event.target.value)}
                placeholder="e.g. JPY"
                maxLength={3}
                className="h-11 border-[#d7dfd3] bg-[#fbfcf8] dark:border-[#425749] dark:bg-[#17251d]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-[#b9c7b6] bg-transparent text-[#35523b] hover:bg-[#edf4df] dark:border-[#526958] dark:text-[#d7e9d0] dark:hover:bg-[#2a4032]"
              onClick={requestLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {isLocating ? "Finding you…" : "Use my location"}
            </Button>
          </div>
          {feeFilterMessage && (
            <p className="mt-3 text-xs text-[#8b5a3b] dark:text-[#e7b28f]" role="status">
              {feeFilterMessage}
            </p>
          )}
          {locationMessage && (
            <p
              className="mt-3 flex items-start gap-2 text-xs text-[#647568] dark:text-[#b0c5b2]"
              role="status"
            >
              <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {locationMessage}
            </p>
          )}
        </section>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#718073] dark:text-[#adc0ae]">
              Published spaces
            </p>
            <h2 className="mt-2 font-[Manrope,sans-serif] text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
              Explore what is listed
            </h2>
          </div>
          {!searchQuery.isPending && !searchQuery.isError && (
            <p className="text-sm text-[#748077] dark:text-[#a9b9aa]">
              {facilities.length} {facilities.length === 1 ? "space" : "spaces"}
            </p>
          )}
        </div>

        {searchQuery.isPending ? (
          <div
            className="mt-6 grid gap-4 md:grid-cols-2"
            aria-label="Loading published spaces"
            aria-busy="true"
          >
            {[0, 1, 2, 3].map(item => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-[#dfe4db] bg-white/65 dark:border-[#34483b] dark:bg-[#203128]"
              />
            ))}
          </div>
        ) : searchQuery.isError ? (
          <section
            className="mt-6 rounded-2xl border border-[#e4cfc3] bg-[#fffaf7] p-8 dark:border-[#60463c] dark:bg-[#2b211e]"
            role="alert"
          >
            <AlertCircle className="h-7 w-7 text-[#a05e42] dark:text-[#eaa27e]" />
            <h3 className="mt-4 font-[Manrope,sans-serif] text-xl font-semibold">
              Spaces could not be loaded
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#756c66] dark:text-[#cbb6ab]">
              Please try again. Your search filters have been kept.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => searchQuery.refetch()}
            >
              Try again
            </Button>
          </section>
        ) : facilities.length === 0 ? (
          <section
            className="mt-6 rounded-2xl border border-dashed border-[#bdcbb9] bg-[#edf3df]/65 p-10 text-center dark:border-[#536b58] dark:bg-[#22372a]"
            aria-live="polite"
          >
            <MapPin className="mx-auto h-8 w-8 text-[#789a4d] dark:text-[#c8f06c]" />
            <h3 className="mt-4 font-[Manrope,sans-serif] text-xl font-semibold">
              No spaces are listed yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e7c70] dark:text-[#b6c7b5]">
              Try a different search, or come back when more published spaces
              are available.
            </p>
          </section>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {facilities.map(facility => {
              const facilityCategory = categoryOptions.find(
                option => option.value === facility.category
              );
              const CategoryIcon = facilityCategory?.icon ?? MapPin;
              return (
                <Link
                  key={facility.id}
                  href={`/app/facilities/${facility.id}`}
                  className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9acb52] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f6ef] dark:focus-visible:ring-offset-[#17231d]"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-[#dfe4db] bg-white/80 p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-[#aec795] group-hover:shadow-[0_18px_42px_rgba(35,56,47,0.1)] dark:border-[#34483b] dark:bg-[#203128] dark:group-hover:border-[#72955b] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e7f0da] text-[#587e38] dark:bg-[#324b35] dark:text-[#c8f06c]">
                          <CategoryIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718276] dark:text-[#abc1ab]">
                            {categoryLabel(facility.category)}
                          </p>
                          <h3 className="mt-1 truncate font-[Manrope,sans-serif] text-xl font-semibold tracking-[-0.045em]">
                            {facility.name}
                          </h3>
                        </div>
                      </div>
                      <ArrowRight
                        className="mt-1 h-5 w-5 shrink-0 text-[#769254] transition-transform group-hover:translate-x-1 dark:text-[#c8f06c]"
                        aria-hidden="true"
                      />
                    </div>

                    <p className="mt-5 line-clamp-2 min-h-12 text-sm leading-6 text-[#68756b] dark:text-[#b5c3b5]">
                      {facility.description || "Description not provided."}
                    </p>

                    <div className="mt-5 grid gap-3 border-t border-[#e3e8df] pt-4 text-sm dark:border-[#35493c] sm:grid-cols-2">
                      <div className="flex items-start gap-2 text-[#65736a] dark:text-[#b5c4b6]">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#719146] dark:text-[#c8f06c]" />
                        <span>
                          {[facility.area, facility.city]
                            .filter(Boolean)
                            .join(", ") || "Location not provided"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-[#65736a] dark:text-[#b5c4b6]">
                        <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-[#719146] dark:text-[#c8f06c]" />
                        <span>
                          {facility.distanceKm != null
                            ? `${facility.distanceKm.toFixed(1)} km away`
                            : "Distance not available"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto grid gap-3 border-t border-[#e3e8df] pt-4 dark:border-[#35493c] sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#849087] dark:text-[#9eb2a0]">
                          Fee
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatFee(
                            facility.feeMin,
                            facility.feeMax,
                            facility.currencyCode
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#849087] dark:text-[#9eb2a0]">
                          TasseiScore
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#547a32] dark:text-[#c8f06c]">
                          {facility.tasseiScore != null
                            ? `${facility.tasseiScore.toFixed(1)} · ${facility.reviewCount} ${facility.reviewCount === 1 ? "review" : "reviews"}`
                            : "Not rated yet"}
                        </p>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        {searchQuery.isFetching && !searchQuery.isPending && (
          <p
            className="mt-4 text-right text-xs text-[#748077] dark:text-[#a9b9aa]"
            role="status"
          >
            Updating results…
          </p>
        )}
      </div>
    </main>
  );
}
