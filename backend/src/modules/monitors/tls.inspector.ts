import tls from "tls"
import { assertPublicUrl } from "../../lib/ssrf"

export interface SslTelemetry {
    issuer: string
    validTo: Date
    daysRemaining: number
    // Did the certificate actually validate — chain, expiry, and hostname?
    // Previously the connection was made with rejectUnauthorized:false and this
    // was never determined, so an expired or mismatched cert still reported UP
    // in a product whose selling point is noticing exactly that.
    valid: boolean
    error: string | null
}

export async function inspectSslCertificate(targetUrl: string): Promise<SslTelemetry | null> {
    try {
        const url = new URL(targetUrl)
        if (url.protocol !== "https:") return null;

        // Same guard as the HTTP probe — this opens a socket to a user-supplied
        // host:port and would otherwise be an unauthenticated port scanner.
        await assertPublicUrl(targetUrl);

        return new Promise((resolve) => {
            let settled = false;
            const finish = (value: SslTelemetry | null) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };

            // Connect with verification ON. We still want telemetry for a cert
            // that fails validation, so failures are captured and reported
            // rather than silently accepted: `rejectUnauthorized: false` plus an
            // explicit `authorized` check gives us the certificate details AND
            // the verdict, instead of trading one for the other.
            const socket = tls.connect(
                {
                    host: url.hostname,
                    port: Number(url.port) || 443,
                    servername: url.hostname,
                    rejectUnauthorized: false,
                },
                () => {
                    const cert = socket.getPeerCertificate();
                    const authorized = socket.authorized;
                    const authorizationError = socket.authorizationError;
                    socket.end()

                    if (!cert || Object.keys(cert).length === 0) {
                        return finish(null)
                    }

                    const validTo = new Date(cert.valid_to)
                    const daysRemaining = Math.floor((
                        validTo.getTime() - Date.now()
                    ) / (1000 * 60 * 60 * 24))

                    const issuerName = [cert.issuer?.O, cert.issuer?.CN]
                        .flat()
                        .filter(Boolean)
                        .join(", ") || "Unknown Authority";

                    finish({
                        issuer: issuerName,
                        validTo,
                        daysRemaining,
                        valid: authorized,
                        error: authorized
                            ? null
                            : String(authorizationError ?? "Certificate verification failed"),
                    });
                }
            )

            socket.on("error", () => {
                socket.destroy();
                finish(null)
            })

            socket.setTimeout(5000, () => {
                socket.destroy()
                finish(null)
            })
        })
    } catch (error) {
        return null
    }
}
