import tls from "tls"

export interface SslTelemetry {
    issuer: string
    validTo: Date
    daysRemaining: number
}

export async function inspectSslCertificate(targetUrl: string): Promise<SslTelemetry | null> {
    try {
        const url = new URL(targetUrl)
        if (url.protocol !== "https:") return null;

        return new Promise((resolve, reject) => {
            const socket = tls.connect(
                {
                    host: url.hostname,
                    port: Number(url.port) || 443,
                    servername: url.hostname,
                    rejectUnauthorized: false,
                },
                () => {
                    const cert = socket.getPeerCertificate();
                    socket.end()

                    if (!cert || Object.keys(cert).length === 0) {
                        return resolve(null)
                    }

                    const validTo = new Date(cert.valid_to)
                    const daysRemaining = Math.floor((
                        validTo.getTime() - Date.now()
                    ) / (1000 * 60 * 60 * 24))

                    const issuerName = [cert.issuer?.O, cert.issuer?.CN]
                        .flat()
                        .filter(Boolean)
                        .join(", ") || "Unknown Authority";

                    resolve({
                        issuer: issuerName,
                        validTo,
                        daysRemaining
                    });
                }
            )

            socket.on("error", (err) => {
                socket.destroy();
                resolve(null)
            })

            socket.setTimeout(5000, () => {
                socket.destroy()
                resolve(null)
            })
        })
    } catch (error) {
        return null
    }
}
