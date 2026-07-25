package engine

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"go.uber.org/zap"
)

type Target struct {
	ID             int    `json:"id"`
	URL            string `json:"url"`
	Method         string `json:"method"`
	ExpectedStatus int    `json:"expected_status"`
	TimeoutMs      int    `json:"timeout_ms"`
	WorkspaceID    int    `json:"workspace_id"`
}

type Result struct {
	TargetID    int           `json:"target_id"`
	WorkspaceID int           `json:"workspace_id"`
	StatusCode  int           `json:"status_code"`
	Latency     time.Duration `json:"latency"`
	IsUp        bool          `json:"is_up"`
	// Why the probe failed. Previously discarded entirely, which left
	// MonitorCheck.errorMessage permanently null and made a DNS failure
	// indistinguishable from a connection refusal or a timeout.
	Error       string    `json:"error,omitempty"`
	TLSIssuer   string    `json:"tls_issuer,omitempty"`
	TLSDaysLeft int       `json:"tls_days_left,omitempty"`
	TLSValid    *bool     `json:"tls_valid,omitempty"`
	TLSError    string    `json:"tls_error,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
}

const (
	defaultTimeout = 10 * time.Second
	maxBodyDrain   = 32 << 10 // 32 KiB — enough to let keep-alive reuse the conn
)

// One transport shared by the whole pool. Previously each worker built its own
// with MaxIdleConns:100, so 50 workers meant 50 disjoint pools and up to 5,000
// idle connections.
var (
	sharedTransport     *http.Transport
	sharedTransportOnce sync.Once
)

func getTransport() *http.Transport {
	sharedTransportOnce.Do(func() {
		sharedTransport = &http.Transport{
			// Certificates are verified. This engine reports SSL health — with
			// InsecureSkipVerify an expired, self-signed, or hostname-mismatched
			// certificate was reported UP, which is precisely the failure the
			// product exists to catch. Verification failures are surfaced as a
			// TLS error below rather than silently accepted.
			TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
			MaxIdleConns:          200,
			MaxIdleConnsPerHost:   4,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			DisableKeepAlives:     false,
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
		}
	})
	return sharedTransport
}

// classifyError turns a transport error into a short, human-readable reason and
// reports whether it was a certificate problem.
func classifyError(err error) (msg string, isTLS bool) {
	// NOTE: the x509 error types are *value* types — their Error() methods have
	// value receivers, so the chain contains x509.HostnameError, not
	// *x509.HostnameError. Declaring these as pointers makes errors.As never
	// match and every certificate failure falls through to the default branch.
	var certErr x509.CertificateInvalidError
	var hostErr x509.HostnameError
	var authorityErr x509.UnknownAuthorityError
	var tlsRecordErr tls.RecordHeaderError
	var tlsVerifyErr *tls.CertificateVerificationError
	var dnsErr *net.DNSError

	switch {
	case errors.As(err, &hostErr):
		return "TLS certificate is not valid for this hostname", true
	case errors.As(err, &authorityErr):
		return "TLS certificate signed by an unknown authority", true
	case errors.As(err, &certErr):
		if certErr.Reason == x509.Expired {
			return "TLS certificate has expired or is not yet valid", true
		}
		return "TLS certificate is invalid: " + certErr.Error(), true
	case errors.As(err, &tlsVerifyErr):
		// Catch-all for verification failures whose cause isn't one of the
		// concrete x509 types above.
		return "TLS certificate verification failed", true
	case errors.As(err, &tlsRecordErr):
		return "TLS handshake failed", true
	case errors.Is(err, context.DeadlineExceeded):
		return "Request timed out", false
	case errors.As(err, &dnsErr):
		return "DNS lookup failed for " + dnsErr.Name, false
	case errors.Is(err, context.Canceled):
		return "Request cancelled during shutdown", false
	default:
		var opErr *net.OpError
		if errors.As(err, &opErr) {
			return "Connection failed: " + opErr.Err.Error(), false
		}
		return err.Error(), false
	}
}

func StartWorker(id int, targetChan <-chan Target, resultChan chan<- Result, log *zap.SugaredLogger) {
	client := &http.Client{
		Transport: getTransport(),
		// Belt-and-braces alongside the per-request context deadline.
		Timeout: 60 * time.Second,
	}

	log.Debugf("Worker [%d] initialized and awaiting tasks", id)

	for target := range targetChan {
		resultChan <- probe(client, target)
	}
}

func probe(client *http.Client, target Target) Result {
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

	timeout := defaultTimeout
	if target.TimeoutMs > 0 {
		timeout = time.Duration(target.TimeoutMs) * time.Millisecond
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, method, target.URL, nil)
	if err != nil {
		result.StatusCode = 0
		result.Error = "Invalid request: " + err.Error()
		return result
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		result.Latency = time.Since(startTime)
		result.StatusCode = 0

		msg, isTLS := classifyError(err)
		result.Error = msg
		if isTLS {
			invalid := false
			result.TLSValid = &invalid
			result.TLSError = msg
		}
		return result
	}
	defer resp.Body.Close()

	result.Latency = time.Since(startTime)
	result.StatusCode = resp.StatusCode

	expectedStatus := target.ExpectedStatus
	if expectedStatus == 0 {
		expectedStatus = 200
	}
	if resp.StatusCode == expectedStatus {
		result.IsUp = true
	} else {
		result.Error = http.StatusText(resp.StatusCode)
		if result.Error == "" {
			result.Error = "Unexpected status code"
		}
	}

	if resp.TLS != nil && len(resp.TLS.PeerCertificates) > 0 {
		cert := resp.TLS.PeerCertificates[0]
		result.TLSIssuer = cert.Issuer.CommonName
		result.TLSDaysLeft = int(time.Until(cert.NotAfter).Hours() / 24)
		// We got here through a verifying transport, so the chain is good.
		valid := true
		result.TLSValid = &valid
	}

	// Drain (a bounded prefix of) the body before closing so the connection can
	// actually be reused — closing without reading defeats keep-alive.
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, maxBodyDrain))

	return result
}
