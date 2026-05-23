package model

import "time"

type HotRankingPeriod string

const (
	HotRankingPeriodDay   HotRankingPeriod = "day"
	HotRankingPeriodWeek  HotRankingPeriod = "week"
	HotRankingPeriodMonth HotRankingPeriod = "month"
	HotRankingPeriodYear  HotRankingPeriod = "year"
)

type HotRankingCategory string

const (
	HotRankingCategoryMovie HotRankingCategory = "movie"
	HotRankingCategoryTV    HotRankingCategory = "tv"
	HotRankingCategoryAnime HotRankingCategory = "anime"
)

type HotRankingItem struct {
	ID              int                `json:"id" sonic:"id"`
	TMDBID          int                `json:"tmdb_id" sonic:"tmdb_id"`
	MediaType       string             `json:"media_type" sonic:"media_type"`
	RankingCategory HotRankingCategory `json:"ranking_category" sonic:"ranking_category"`
	Title           string             `json:"title" sonic:"title"`
	OriginalTitle   string             `json:"original_title" sonic:"original_title"`
	Overview        string             `json:"overview" sonic:"overview"`
	PosterURL       string             `json:"poster_url" sonic:"poster_url"`
	BackdropURL     string             `json:"backdrop_url" sonic:"backdrop_url"`
	VoteAverage     float64            `json:"vote_average" sonic:"vote_average"`
	VoteCount       int                `json:"vote_count" sonic:"vote_count"`
	Popularity      float64            `json:"popularity" sonic:"popularity"`
	ReleaseDate     string             `json:"release_date" sonic:"release_date"`
	GenreNames      []string           `json:"genre_names" sonic:"genre_names"`
	Region          string             `json:"region,omitempty" sonic:"region,omitempty"`
	OriginCountries []string           `json:"origin_countries,omitempty" sonic:"origin_countries,omitempty"`
	TMDBURL         string             `json:"tmdb_url" sonic:"tmdb_url"`
}

type HotRankingSection struct {
	Category    HotRankingCategory `json:"category" sonic:"category"`
	Title       string             `json:"title" sonic:"title"`
	Description string             `json:"description" sonic:"description"`
	Spotlight   *HotRankingItem    `json:"spotlight,omitempty" sonic:"spotlight,omitempty"`
	Items       []HotRankingItem   `json:"items" sonic:"items"`
}

type HotRankingResponse struct {
	Period    HotRankingPeriod    `json:"period" sonic:"period"`
	UpdatedAt time.Time           `json:"updated_at" sonic:"updated_at"`
	Source    string              `json:"source" sonic:"source"`
	Note      string              `json:"note,omitempty" sonic:"note,omitempty"`
	Sections  []HotRankingSection `json:"sections" sonic:"sections"`
}

func NormalizeHotRankingPeriod(raw string) HotRankingPeriod {
	switch HotRankingPeriod(raw) {
	case HotRankingPeriodDay, HotRankingPeriodWeek, HotRankingPeriodMonth, HotRankingPeriodYear:
		return HotRankingPeriod(raw)
	default:
		return HotRankingPeriodDay
	}
}

func NormalizeHotRankingCategory(raw string) HotRankingCategory {
	switch HotRankingCategory(raw) {
	case HotRankingCategoryMovie, HotRankingCategoryTV, HotRankingCategoryAnime:
		return HotRankingCategory(raw)
	default:
		return HotRankingCategoryMovie
	}
}
