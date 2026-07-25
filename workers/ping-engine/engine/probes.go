package engine

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Probes for the non-HTTP check types.
//
// Each returns a populated Result; the caller (probe) picks the right one by
// Target.Type. Keeping them here rather than in worker.go keeps the HTTP path —
// the hot one — readable.

const maxKeywordBody = 1 << 20 // 1 MiB is plenty to find a marker string

// hostFromTarget pulls a bare hostname out of whatever the user typed. Monitor
// URLs are stored with a scheme (the create form prepends https://), but TCP
// and DNS checks are conceptually host-based.
func hostFromTarget(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if u, err := url.Parse(trimmed); err == nil && u.Host != "" {
		if h, _, err := net.SplitHostPort(u.Host); err == nil {
			return h
		}
		return u.Host
	}
	if h, _, err := net.SplitHostPort(trimmed); err == nil {
		return h
	}
	return trimmed
}

// probeTCP opens a TCP connection and reports whether it was accepted. Latency
// is the connect time, which is the useful signal for a port check.
func probeTCP(ctx context.Context, target Target, result Result) Result {
	host := hostFromTarget(target.URL)
	port := target.TCPPort
	if port == 0 {
		result.Error = "TCP check requires a port"
		return result
	}

	address := net.JoinHostPort(host, strconv.Itoa(port))
	dialer := &net.Dialer{}

	start := time.Now()
	conn, err := dialer.DialContext(ctx, "tcp", address)
	result.Latency = time.Since(start)

	if err != nil {
		msg, _ := classifyError(err)
		result.Error = msg
		return result
	}
	_ = conn.Close()

	result.IsUp = true
	return result
}

// probeDNS resolves a record and optionally asserts the answer contains an
// expected value — enough to catch "the record vanished" and "the record now
// points somewhere else".
func probeDNS(ctx context.Context, target Target, result Result) Result {
	host := hostFromTarget(target.URL)
	recordType := strings.ToUpper(strings.TrimSpace(target.DNSRecordType))
	if recordType == "" {
		recordType = "A"
	}

	resolver := &net.Resolver{}
	start := time.Now()

	var answers []string
	var err error

	switch recordType {
	case "A", "AAAA":
		var ips []net.IP
		ips, err = resolver.LookupIP(ctx, map[string]string{"A": "ip4", "AAAA": "ip6"}[recordType], host)
		for _, ip := range ips {
			answers = append(answers, ip.String())
		}
	case "CNAME":
		var cname string
		cname, err = resolver.LookupCNAME(ctx, host)
		if cname != "" {
			answers = append(answers, strings.TrimSuffix(cname, "."))
		}
	case "MX":
		var records []*net.MX
		records, err = resolver.LookupMX(ctx, host)
		for _, mx := range records {
			answers = append(answers, strings.TrimSuffix(mx.Host, "."))
		}
	case "TXT":
		answers, err = resolver.LookupTXT(ctx, host)
	case "NS":
		var records []*net.NS
		records, err = resolver.LookupNS(ctx, host)
		for _, ns := range records {
			answers = append(answers, strings.TrimSuffix(ns.Host, "."))
		}
	default:
		result.Error = fmt.Sprintf("Unsupported DNS record type %q", recordType)
		return result
	}

	result.Latency = time.Since(start)

	if err != nil {
		msg, _ := classifyError(err)
		result.Error = msg
		return result
	}

	if len(answers) == 0 {
		result.Error = fmt.Sprintf("No %s records found for %s", recordType, host)
		return result
	}

	expected := strings.TrimSpace(target.DNSExpectedValue)
	if expected != "" {
		for _, answer := range answers {
			if strings.EqualFold(answer, expected) || strings.Contains(answer, expected) {
				result.IsUp = true
				return result
			}
		}
		result.Error = fmt.Sprintf(
			"%s record for %s is %s, expected %s",
			recordType, host, strings.Join(answers, ", "), expected,
		)
		return result
	}

	result.IsUp = true
	return result
}

// probeKeyword performs a normal HTTP request and then asserts on the body —
// the difference between "the server answered" and "the page is actually
// right", which a status-code check can't see.
func probeKeyword(client *http.Client, ctx context.Context, target Target, result Result) Result {
	method := target.Method
	if method == "" {
		method = "GET"
	}

	req, err := http.NewRequestWithContext(ctx, method, target.URL, nil)
	if err != nil {
		result.Error = "Invalid request: " + err.Error()
		return result
	}

	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		result.Latency = time.Since(start)
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

	result.Latency = time.Since(start)
	result.StatusCode = resp.StatusCode
	applyTLSInfo(&result, resp)

	body, readErr := io.ReadAll(io.LimitReader(resp.Body, maxKeywordBody))
	if readErr != nil {
		result.Error = "Could not read response body: " + readErr.Error()
		return result
	}

	keyword := target.Keyword
	if keyword == "" {
		result.Error = "Keyword check requires a keyword"
		return result
	}

	found := strings.Contains(string(body), keyword)

	// The status code still has to be acceptable — a keyword found on a 500
	// error page is not a healthy result.
	if !statusMatches(resp.StatusCode, target) {
		result.Error = fmt.Sprintf("Unexpected status %d", resp.StatusCode)
		return result
	}

	if found == target.KeywordShouldExist {
		result.IsUp = true
		return result
	}

	if target.KeywordShouldExist {
		result.Error = fmt.Sprintf("Keyword %q not found in response body", keyword)
	} else {
		result.Error = fmt.Sprintf("Keyword %q was present but should be absent", keyword)
	}
	return result
}
