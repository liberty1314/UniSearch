package model

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type HotRankingPeriod string
type HotRankingMode string
type HotRankingSortBy string

const (
	HotRankingPeriodDay   HotRankingPeriod = "day"
	HotRankingPeriodWeek  HotRankingPeriod = "week"
	HotRankingPeriodMonth HotRankingPeriod = "month"
	HotRankingPeriodYear  HotRankingPeriod = "year"
)

const (
	HotRankingModeTrend   HotRankingMode = "trend"
	HotRankingModePopular HotRankingMode = "popular"
)

const (
	HotRankingSortByPopularity  HotRankingSortBy = "popularity.desc"
	HotRankingSortByReleaseDate HotRankingSortBy = "primary_release_date.desc"
	HotRankingSortByVoteAverage HotRankingSortBy = "vote_average.desc"
)

type HotRankingCategory string

const (
	HotRankingCategoryAll   HotRankingCategory = "all"
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
	Mode      HotRankingMode      `json:"mode" sonic:"mode"`
	Period    HotRankingPeriod    `json:"period" sonic:"period"`
	TimeKey   string              `json:"time_key,omitempty" sonic:"time_key,omitempty"`
	TimeLabel string              `json:"time_label,omitempty" sonic:"time_label,omitempty"`
	Page      int                 `json:"page" sonic:"page"`
	PageSize  int                 `json:"page_size" sonic:"page_size"`
	HasMore   bool                `json:"has_more" sonic:"has_more"`
	NextPage  int                 `json:"next_page,omitempty" sonic:"next_page,omitempty"`
	UpdatedAt time.Time           `json:"updated_at" sonic:"updated_at"`
	Source    string              `json:"source" sonic:"source"`
	Note      string              `json:"note,omitempty" sonic:"note,omitempty"`
	Sections  []HotRankingSection `json:"sections" sonic:"sections"`
}

type HotRankingQuery struct {
	Mode      HotRankingMode     `json:"mode" sonic:"mode"`
	Period    HotRankingPeriod   `json:"period" sonic:"period"`
	Category  HotRankingCategory `json:"category" sonic:"category"`
	SortBy    HotRankingSortBy   `json:"sort_by,omitempty" sonic:"sort_by,omitempty"`
	Date      string             `json:"date,omitempty" sonic:"date,omitempty"`
	WeekStart string             `json:"week_start,omitempty" sonic:"week_start,omitempty"`
	Month     string             `json:"month,omitempty" sonic:"month,omitempty"`
	Year      string             `json:"year,omitempty" sonic:"year,omitempty"`
	Page      int                `json:"page" sonic:"page"`
	PageSize  int                `json:"page_size" sonic:"page_size"`
}

func NormalizeHotRankingSortBy(raw string) HotRankingSortBy {
	switch HotRankingSortBy(raw) {
	case HotRankingSortByPopularity, HotRankingSortByReleaseDate, HotRankingSortByVoteAverage:
		return HotRankingSortBy(raw)
	default:
		return HotRankingSortByPopularity
	}
}

func NormalizeHotRankingMode(raw string) HotRankingMode {
	switch HotRankingMode(raw) {
	case HotRankingModeTrend, HotRankingModePopular:
		return HotRankingMode(raw)
	default:
		return HotRankingModeTrend
	}
}

func NormalizeHotRankingPeriod(raw string) HotRankingPeriod {
	switch HotRankingPeriod(raw) {
	case HotRankingPeriodDay, HotRankingPeriodWeek, HotRankingPeriodMonth, HotRankingPeriodYear:
		return HotRankingPeriod(raw)
	default:
		return HotRankingPeriodDay
	}
}

func NormalizeHotRankingPage(raw string) int {
	if raw == "" {
		return 1
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 1
	}

	return value
}

func NormalizeHotRankingPageSize(raw string) int {
	const defaultPageSize = 100
	const maxPageSize = 100

	if raw == "" {
		return defaultPageSize
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return defaultPageSize
	}
	if value > maxPageSize {
		return maxPageSize
	}

	return value
}

func NormalizeHotRankingCategory(raw string) HotRankingCategory {
	switch HotRankingCategory(raw) {
	case HotRankingCategoryAll, HotRankingCategoryMovie, HotRankingCategoryTV, HotRankingCategoryAnime:
		return HotRankingCategory(raw)
	default:
		return HotRankingCategoryAll
	}
}

func ValidateHotRankingQuery(query HotRankingQuery) error {
	if query.Mode == HotRankingModeTrend {
		if query.Period != HotRankingPeriodDay && query.Period != HotRankingPeriodWeek {
			return fmt.Errorf("趋势榜仅支持日榜和周榜")
		}
		if query.SortBy == HotRankingSortByPopularity && (strings.TrimSpace(query.Date) != "" || strings.TrimSpace(query.WeekStart) != "" || strings.TrimSpace(query.Month) != "" || strings.TrimSpace(query.Year) != "") {
			return fmt.Errorf("趋势榜不支持历史时间筛选")
		}
		return nil
	}

	switch query.Period {
	case HotRankingPeriodDay:
		if strings.TrimSpace(query.Date) != "" && !isValidHotRankingDate(query.Date) {
			return fmt.Errorf("日榜日期格式无效")
		}
	case HotRankingPeriodWeek:
		if strings.TrimSpace(query.WeekStart) != "" && !isValidHotRankingDate(query.WeekStart) {
			return fmt.Errorf("周榜起始日期格式无效")
		}
	case HotRankingPeriodMonth:
		if strings.TrimSpace(query.Month) != "" && !isValidHotRankingMonth(query.Month) {
			return fmt.Errorf("月榜月份格式无效")
		}
	case HotRankingPeriodYear:
		if strings.TrimSpace(query.Year) != "" && !isValidHotRankingYear(query.Year) {
			return fmt.Errorf("年榜年份格式无效")
		}
	}

	return nil
}

func isValidHotRankingDate(value string) bool {
	_, err := time.Parse("2006-01-02", value)
	return err == nil
}

func isValidHotRankingMonth(value string) bool {
	_, err := time.Parse("2006-01", value)
	return err == nil
}

func isValidHotRankingYear(value string) bool {
	_, err := time.Parse("2006", value)
	return err == nil
}
