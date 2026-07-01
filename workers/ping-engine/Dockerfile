FROM golang:1.26-alpine AS builder
WORKDIR /app

COPY workers/ping-engine/go.mod workers/ping-engine/go.sum ./
RUN go mod download

COPY workers/ping-engine/main.go ./
COPY workers/ping-engine/engine ./engine

RUN CGO_ENABLED=0 go build -o /ping-engine .

FROM alpine:3.20 AS runner
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=builder /ping-engine ./ping-engine

CMD ["./ping-engine"]
