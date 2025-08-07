package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
)

type Quote struct {
	ID           string `json:"id"`
	From         string `json:"from"`
	Quote        string `json:"quote"`
	ResponseTime string `json:"responseTime,omitempty"`
}

type QuotesData struct {
	quotes    []Quote
	loadTime  time.Time
	totalSize int
}

var (
	quotesCache *QuotesData
	rng         *rand.Rand
)

func init() {
	rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	if err := loadQuotes(); err != nil {
		log.Printf("Warning: Failed to load quotes on startup: %v", err)
	}
}

func loadQuotes() error {
	startTime := time.Now()
	var data []byte
	var err error

	if data, err = os.ReadFile("data/quotes.min.json"); err != nil {
		if data, err = os.ReadFile("public/assets/quotes.min.json"); err != nil {
			return fmt.Errorf("failed to read quotes file: %v", err)
		}
	}

	var quotes []Quote
	if err := json.Unmarshal(data, &quotes); err != nil {
		return fmt.Errorf("failed to parse quotes JSON: %v", err)
	}

	quotesCache = &QuotesData{
		quotes:    quotes,
		loadTime:  time.Now(),
		totalSize: len(quotes),
	}

	log.Printf("Loaded %d quotes in %v", len(quotes), time.Since(startTime))
	return nil
}

func getRandomQuote() (*Quote, error) {
	if quotesCache == nil || len(quotesCache.quotes) == 0 {
		if err := loadQuotes(); err != nil {
			return nil, fmt.Errorf("no quotes available and failed to reload: %v", err)
		}
	}
	index := rng.Intn(len(quotesCache.quotes))
	return &quotesCache.quotes[index], nil
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("X-XSS-Protection", "1; mode=block")
}

func setCacheHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300")
	w.Header().Set("Vary", "Accept-Encoding")
}

func Handler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	setCORSHeaders(w)
	setSecurityHeaders(w)
	setCacheHeaders(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	if r.URL.Query().Get("warmup") == "true" {
		if err := loadQuotes(); err != nil {
			log.Printf("Warmup failed: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Warmup failed"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "warmed",
			"quotes":   quotesCache.totalSize,
			"loadTime": quotesCache.loadTime.Format(time.RFC3339),
		})
		return
	}

	quote, err := getRandomQuote()
	if err != nil {
		log.Printf("Error getting random quote: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get quote"})
		return
	}

	quote.ResponseTime = fmt.Sprintf("%.3fms", float64(time.Since(startTime).Microseconds())/1000)

	w.Header().Set("X-Total-Quotes", strconv.Itoa(quotesCache.totalSize))
	w.Header().Set("X-Cache-Age", time.Since(quotesCache.loadTime).String())
	w.Header().Set("X-Response-Time", quote.ResponseTime)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(quote); err != nil {
		log.Printf("Error encoding response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
	}
	log.Printf("Served quote %s in %s", quote.ID, quote.ResponseTime)
}

// Local dev server
func main() {
	if len(os.Args) > 1 && os.Args[1] == "dev" {
		log.Println("Starting local dev server at http://localhost:8080")
		http.HandleFunc("/api/quotes", Handler)
		http.Handle("/", http.FileServer(http.Dir("public")))
		log.Fatal(http.ListenAndServe(":8080", nil))
	}
}
