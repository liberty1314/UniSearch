package service

import (
	"fmt"
	"sort"

	"unisearch/model"
)

type ResultMerger interface {
	Merge(existing []model.SearchResult, newResults []model.SearchResult) []model.SearchResult
}

type searchResultMerger struct{}

func newResultMerger() ResultMerger {
	return searchResultMerger{}
}

func (searchResultMerger) Merge(existing []model.SearchResult, newResults []model.SearchResult) []model.SearchResult {
	resultMap := make(map[string]model.SearchResult)

	for _, result := range existing {
		resultMap[generateResultKey(result)] = result
	}

	for _, newResult := range newResults {
		key := generateResultKey(newResult)
		if existingResult, exists := resultMap[key]; exists {
			resultMap[key] = selectBetterResult(existingResult, newResult)
			continue
		}

		resultMap[key] = newResult
	}

	merged := make([]model.SearchResult, 0, len(resultMap))
	for _, result := range resultMap {
		merged = append(merged, result)
	}

	sort.Slice(merged, func(i, j int) bool {
		return merged[i].Datetime.After(merged[j].Datetime)
	})

	return merged
}

func generateResultKey(result model.SearchResult) string {
	if result.UniqueID != "" {
		return result.UniqueID
	}
	if result.MessageID != "" {
		return result.MessageID
	}
	return fmt.Sprintf("title_%s_%s", result.Title, result.Channel)
}

func selectBetterResult(existing, new model.SearchResult) model.SearchResult {
	existingScore := calculateCompletenessScore(existing)
	newScore := calculateCompletenessScore(new)

	if newScore > existingScore {
		return new
	}
	return existing
}

func calculateCompletenessScore(result model.SearchResult) int {
	score := 0

	if result.UniqueID != "" {
		score += 10
	}
	if len(result.Links) > 0 {
		score += 5
		score += len(result.Links)
	}
	if result.Content != "" {
		score += 3
	}

	score += len(result.Title) / 10

	if result.Channel != "" {
		score += 2
	}

	score += len(result.Tags)

	return score
}
