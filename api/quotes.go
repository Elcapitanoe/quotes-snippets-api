package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
)

// Quote represents a single quote with ID, author, and text
type Quote struct {
	ID    string `json:"id"`
	From  string `json:"from"`
	Quote string `json:"quote"`
	ResponseTime string `json:"responseTime,omitempty"`
}

// QuotesData holds all quotes loaded from JSON
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
	// Initialize random number generator with current time
	rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	
	// Load quotes on startup
	if err := loadQuotes(); err != nil {
		log.Printf("Warning: Failed to load quotes on startup: %v", err)
	}
}

// loadQuotes reads and parses the quotes JSON file
func loadQuotes() error {
	startTime := time.Now()
	
	// Try to read from the data directory first, then fallback to assets
	var data []byte
	var err error
	
	// First try data/quotes.min.json (generated file)
	if data, err = os.ReadFile("data/quotes.min.json"); err != nil {
		// Fallback to public assets
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
	
	loadDuration := time.Since(startTime)
	log.Printf("Loaded %d quotes in %v", len(quotes), loadDuration)
	
	return nil
}

// getRandomQuote returns a random quote from the cache
func getRandomQuote() (*Quote, error) {
	if quotesCache == nil || len(quotesCache.quotes) == 0 {
		if err := loadQuotes(); err != nil {
			return nil, fmt.Errorf("no quotes available and failed to reload: %v", err)
		}
	}
	
	if len(quotesCache.quotes) == 0 {
		return nil, fmt.Errorf("no quotes available")
	}
	
	// Get random quote
	index := rng.Intn(len(quotesCache.quotes))
	quote := quotesCache.quotes[index]
	
	return &quote, nil
}

// setCORSHeaders sets CORS headers for cross-origin requests
func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// setSecurityHeaders sets security headers
func setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("X-XSS-Protection", "1; mode=block")
}

// setCacheHeaders sets appropriate cache headers
func setCacheHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300")
	w.Header().Set("Vary", "Accept-Encoding")
}

// Handler is the main HTTP handler for the quotes API
func Handler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	
	// Set headers
	setCORSHeaders(w)
	setSecurityHeaders(w)
	setCacheHeaders(w)
	
	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	// Only allow GET requests
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Method not allowed",
		})
		return
	}
	
	// Check for warmup request
	if r.URL.Query().Get("warmup") == "true" {
		if err := loadQuotes(); err != nil {
			log.Printf("Warmup failed: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Warmup failed",
			})
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "warmed",
			"quotes": quotesCache.totalSize,
			"loadTime": quotesCache.loadTime.Format(time.RFC3339),
		})
		return
	}
	
	// Get random quote
	quote, err := getRandomQuote()
	if err != nil {
		log.Printf("Error getting random quote: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to get quote",
		})
		return
	}
	
	// Calculate response time
	responseTime := time.Since(startTime)
	quote.ResponseTime = fmt.Sprintf("%.3fms", float64(responseTime.Nanoseconds())/1000000)
	
	// Set debug headers
	w.Header().Set("X-Total-Quotes", strconv.Itoa(quotesCache.totalSize))
	w.Header().Set("X-Cache-Age", time.Since(quotesCache.loadTime).String())
	w.Header().Set("X-Response-Time", quote.ResponseTime)
	
	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(quote); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	
	log.Printf("Served quote %s in %s", quote.ID, quote.ResponseTime)
}

// For local development
func main() {
	if len(os.Args) > 1 && os.Args[1] == "dev" {
		log.Println("Starting development server on :8080")
		http.HandleFunc("/api/quotes", Handler)
		http.Handle("/", http.FileServer(http.Dir("public/")))
		log.Fatal(http.ListenAndServe(":8080", nil))
	}
}