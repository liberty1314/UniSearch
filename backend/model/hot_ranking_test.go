package model

import "testing"

func TestNormalizeHotRankingPeriodFallsBackToDay(t *testing.T) {
	if got := NormalizeHotRankingPeriod("week"); got != HotRankingPeriodWeek {
		t.Fatalf("expected week, got %q", got)
	}

	if got := NormalizeHotRankingPeriod("invalid"); got != HotRankingPeriodDay {
		t.Fatalf("expected fallback day, got %q", got)
	}
}

func TestNormalizeHotRankingModeFallsBackToTrend(t *testing.T) {
	if got := NormalizeHotRankingMode("popular"); got != HotRankingModePopular {
		t.Fatalf("expected popular, got %q", got)
	}

	if got := NormalizeHotRankingMode("invalid"); got != HotRankingModeTrend {
		t.Fatalf("expected fallback trend, got %q", got)
	}
}

func TestNormalizeHotRankingCategoryFallsBackToAll(t *testing.T) {
	if got := NormalizeHotRankingCategory("anime"); got != HotRankingCategoryAnime {
		t.Fatalf("expected anime, got %q", got)
	}

	if got := NormalizeHotRankingCategory("invalid"); got != HotRankingCategoryAll {
		t.Fatalf("expected fallback all, got %q", got)
	}
}

func TestNormalizeHotRankingPageFallsBackToOne(t *testing.T) {
	if got := NormalizeHotRankingPage("3"); got != 3 {
		t.Fatalf("expected 3, got %d", got)
	}

	if got := NormalizeHotRankingPage("invalid"); got != 1 {
		t.Fatalf("expected fallback 1, got %d", got)
	}
}

func TestNormalizeHotRankingPageSizeCapsAtHundred(t *testing.T) {
	if got := NormalizeHotRankingPageSize("20"); got != 20 {
		t.Fatalf("expected 20, got %d", got)
	}

	if got := NormalizeHotRankingPageSize("300"); got != 100 {
		t.Fatalf("expected capped 100, got %d", got)
	}
}

func TestValidateHotRankingQueryRejectsTrendMonth(t *testing.T) {
	err := ValidateHotRankingQuery(HotRankingQuery{
		Mode:   HotRankingModeTrend,
		Period: HotRankingPeriodMonth,
	})

	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
}

func TestValidateHotRankingQueryRejectsTrendHistoryFilter(t *testing.T) {
	err := ValidateHotRankingQuery(HotRankingQuery{
		Mode:   HotRankingModeTrend,
		Period: HotRankingPeriodDay,
		Date:   "2026-05-24",
	})

	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
}

func TestValidateHotRankingQueryRejectsInvalidPopularMonth(t *testing.T) {
	err := ValidateHotRankingQuery(HotRankingQuery{
		Mode:   HotRankingModePopular,
		Period: HotRankingPeriodMonth,
		Month:  "2026-13",
	})

	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
}
