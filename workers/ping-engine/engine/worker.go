package engine

import (
	"crypto/tls"
	"net/http"
	"time"

	"go.uber.org/zap"
)

type Target struct {
	ID             int    `json:"id"`
	URL            string `json:"url"`
	Method         string `json:"method"`
	ExpectedStatus int    `json:"expected_status"`
	WorkspaceID    int    `json:"workspace_id"`
}

type Result struct {
	TargetID    int           `json:"target_id"`
	WorkspaceID int           `json:"workspace_id"`
	StatusCode  int           `json:"status_code"`
	Latency     time.Duration `json:"latency"`
	IsUp        bool          `json:"is_up"`
	TLSIssuer   string        `json:"tls_issuer,omitempty"`
	TLSDaysLeft int           `json:"tls_days_left,omitempty"`
	Timestamp   time.Time     `json:"timestamp"`
}

func StartWorker(id int, targetChan <-chan Target, resultChan chan<- Result, log *zap.SugaredLogger) {
	transport := &http.Transport{
		TLSClientConfig:   &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:      100,
		IdleConnTimeout:   90 * time.Second,
		DisableKeepAlives: false,
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
	}

	log.Debugf("Worker [%d] initialized and awaiting tasks", id)

	for target := range targetChan {
		result := Result{
			TargetID:    target.ID,
			WorkspaceID: target.WorkspaceID,
			Timestamp:   time.Now(),
			IsUp:        false,
		}

		method := target.Method
		if method == "" {
			method = "GET"
		}

		req, err := http.NewRequest(method, target.URL, nil)
		if err != nil {
			result.Latency = 0
			result.StatusCode = 0
			resultChan <- result
			continue
		}

		startTime := time.Now()
		resp, err := client.Do(req)
		if err != nil {
			result.Latency = time.Since(startTime)
			result.StatusCode = 0
			resultChan <- result
			continue
		}

		result.Latency = time.Since(startTime)
		result.StatusCode = resp.StatusCode

		expectedStatus := target.ExpectedStatus
		if expectedStatus == 0 {
			expectedStatus = 200
		}
		if resp.StatusCode == expectedStatus {
			result.IsUp = true
		}

		if resp.TLS != nil && len(resp.TLS.PeerCertificates) > 0 {
			cert := resp.TLS.PeerCertificates[0]
			result.TLSIssuer = cert.Issuer.CommonName
			result.TLSDaysLeft = int(time.Until(cert.NotAfter).Hours() / 24)
		}
		resp.Body.Close()

		resultChan <- result
	}
}
