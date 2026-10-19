import { describe, expect, it } from "vitest";
import { haversineDistanceKm, summarizeReviews } from "./shared";

describe("fitness marketplace calculations", () => {
  it("does not invent a score for a facility with no published reviews", () => {
    expect(summarizeReviews([])).toEqual({ tasseiScore: null, reviewCount: 0 });
  });

  it("averages the four published review dimensions into a transparent TasseiScore", () => {
    const summary = summarizeReviews([
      { venueRating: 5, staffRating: 4, cleanlinessRating: 3, crowdingRating: 4 },
      { venueRating: 4, staffRating: 4, cleanlinessRating: 4, crowdingRating: 4 },
    ]);

    expect(summary).toEqual({ tasseiScore: 4, reviewCount: 2 });
  });

  it("calculates near-me distance in kilometers", () => {
    expect(haversineDistanceKm(0, 0, 0, 1)).toBeCloseTo(111.2, 1);
  });
});
