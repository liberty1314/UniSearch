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

func TestNormalizeHotRankingCategoryFallsBackToMovie(t *testing.T) {
	if got := NormalizeHotRankingCategory("anime"); got != HotRankingCategoryAnime {
		t.Fatalf("expected anime, got %q", got)
	}

	if got := NormalizeHotRankingCategory("invalid"); got != HotRankingCategoryMovie {
		t.Fatalf("expected fallback movie, got %q", got)
	}
}
