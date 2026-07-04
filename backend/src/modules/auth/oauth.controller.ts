import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../../lib/redis";
import {
  createAuthorization,
  fetchOAuthUser,
  isProviderConfigured,
  isProviderKey,
} from "../../lib/oauth";
import { completeAuthentication } from "./auth.service";
import { resolveOAuthUser } from "./oauth.service";
import { metaFrom } from "./auth.controller";
import { oauthExchangeSchema } from "./auth.schema";

const STATE_TTL_SECONDS = 600; // 10 minutes to complete the provider consent
const HANDOFF_TTL_SECONDS = 60; // frontend must claim the session within a minute

function frontendBase(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim();
}

/** GET /oauth/:provider — redirect the browser to the provider's consent screen. */
export async function oauthStartController(
  request: FastifyRequest<{ Params: { provider: string } }>,
  response: FastifyReply,
) {
  const { provider } = request.params;
  if (!isProviderKey(provider)) {
    return response.status(404).send({ message: "Unknown provider" });
  }
  if (!isProviderConfigured(provider)) {
    return response.redirect(`${frontendBase()}/login?error=oauth_unavailable`);
  }

  const { url, state, codeVerifier } = createAuthorization(provider);
  await redis.set(
    `oauth:state:${state}`,
    JSON.stringify({ provider, codeVerifier }),
    "EX",
    STATE_TTL_SECONDS,
  );

  return response.redirect(url);
}

/** GET /oauth/:provider/callback — exchange the code and hand a session to the frontend. */
export async function oauthCallbackController(
  request: FastifyRequest<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  response: FastifyReply,
) {
  const { provider } = request.params;
  const { code, state, error } = request.query;

  if (error || !code || !state || !isProviderKey(provider)) {
    return response.redirect(`${frontendBase()}/login?error=oauth`);
  }

  try {
    const stored = await redis.getdel(`oauth:state:${state}`);
    if (!stored) {
      return response.redirect(`${frontendBase()}/login?error=oauth_state`);
    }
    const { provider: storedProvider, codeVerifier } = JSON.parse(stored);
    if (storedProvider !== provider) {
      return response.redirect(`${frontendBase()}/login?error=oauth_state`);
    }

    const normalized = await fetchOAuthUser(provider, code, codeVerifier);
    const user = await resolveOAuthUser(provider, normalized);
    const result = await completeAuthentication(user, metaFrom(request));

    // Never put tokens in the redirect URL — stash them behind a single-use
    // handoff code the frontend exchanges server-to-server.
    const handoff = crypto.randomBytes(32).toString("hex");
    await redis.set(
      `oauth:handoff:${handoff}`,
      JSON.stringify(result),
      "EX",
      HANDOFF_TTL_SECONDS,
    );

    return response.redirect(`${frontendBase()}/api/auth/oauth/callback?code=${handoff}`);
  } catch (err) {
    request.log.error(err);
    return response.redirect(`${frontendBase()}/login?error=oauth`);
  }
}

/** POST /oauth/exchange — the frontend claims the session behind a handoff code. */
export async function oauthExchangeController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const { code } = oauthExchangeSchema.parse(request.body);
    const stored = await redis.getdel(`oauth:handoff:${code}`);
    if (!stored) {
      return response.status(400).send({ message: "Invalid or expired code" });
    }
    return response.status(200).send({ message: "Signed in", data: JSON.parse(stored) });
  } catch (error: any) {
    if (error?.issues) {
      const messages = error.issues.map((i: any) => i.message).join("; ");
      return response.status(400).send({ message: messages || "Invalid input" });
    }
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Exchange failed",
    });
  }
}
