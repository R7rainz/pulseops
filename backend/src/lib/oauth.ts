import {
  Google,
  GitHub,
  MicrosoftEntraId,
  generateState,
  generateCodeVerifier,
  type OAuth2Tokens,
} from "arctic";
import axios from "axios";
import type { OAuthProvider } from "../generated/prisma/client";

// Hand-rolled OAuth using `arctic` for the authorize/token dance (state + PKCE
// where the provider supports it). Userinfo is normalized to a common shape so
// the callback logic doesn't care which provider it came from.

export type ProviderKey = "google" | "github" | "microsoft";

export const PROVIDER_ENUM: Record<ProviderKey, OAuthProvider> = {
  google: "GOOGLE",
  github: "GITHUB",
  microsoft: "MICROSOFT",
};

export function isProviderKey(value: string): value is ProviderKey {
  return value === "google" || value === "github" || value === "microsoft";
}

export type NormalizedOAuthUser = {
  providerAccountId: string;
  email: string | null;
  name: string | null;
};

export type AuthorizationRequest = {
  url: string;
  state: string;
  codeVerifier: string; // empty string for providers without PKCE (GitHub)
};

const CALLBACK_BASE = process.env.OAUTH_CALLBACK_BASE || "http://localhost:4000";

function redirectUri(provider: ProviderKey): string {
  return `${CALLBACK_BASE}/api/v1/auth/oauth/${provider}/callback`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function isProviderConfigured(provider: ProviderKey): boolean {
  switch (provider) {
    case "google":
      return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case "github":
      return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    case "microsoft":
      return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  }
}

function googleClient() {
  return new Google(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri("google"),
  );
}

function githubClient() {
  return new GitHub(
    requireEnv("GITHUB_CLIENT_ID"),
    requireEnv("GITHUB_CLIENT_SECRET"),
    redirectUri("github"),
  );
}

function microsoftClient() {
  const tenant = process.env.MICROSOFT_TENANT || "common";
  return new MicrosoftEntraId(
    tenant,
    requireEnv("MICROSOFT_CLIENT_ID"),
    requireEnv("MICROSOFT_CLIENT_SECRET"),
    redirectUri("microsoft"),
  );
}

/** Build the provider authorize URL plus the state/PKCE values to persist. */
export function createAuthorization(provider: ProviderKey): AuthorizationRequest {
  const state = generateState();

  if (provider === "github") {
    const url = githubClient().createAuthorizationURL(state, ["read:user", "user:email"]);
    return { url: url.toString(), state, codeVerifier: "" };
  }

  const codeVerifier = generateCodeVerifier();
  const scopes = ["openid", "profile", "email"];
  const url =
    provider === "google"
      ? googleClient().createAuthorizationURL(state, codeVerifier, scopes)
      : microsoftClient().createAuthorizationURL(state, codeVerifier, scopes);

  return { url: url.toString(), state, codeVerifier };
}

/** Exchange the callback code for tokens and return normalized user info. */
export async function fetchOAuthUser(
  provider: ProviderKey,
  code: string,
  codeVerifier: string,
): Promise<NormalizedOAuthUser> {
  switch (provider) {
    case "google": {
      const tokens = await googleClient().validateAuthorizationCode(code, codeVerifier);
      const claims = decodeIdToken(tokens.idToken());
      return {
        providerAccountId: String(claims.sub),
        email: typeof claims.email === "string" ? claims.email : null,
        name: typeof claims.name === "string" ? claims.name : null,
      };
    }
    case "microsoft": {
      const tokens = await microsoftClient().validateAuthorizationCode(code, codeVerifier);
      const claims = decodeIdToken(tokens.idToken());
      const email =
        (typeof claims.email === "string" && claims.email) ||
        (typeof claims.preferred_username === "string" && claims.preferred_username) ||
        null;
      return {
        providerAccountId: String(claims.sub ?? claims.oid),
        email,
        name: typeof claims.name === "string" ? claims.name : null,
      };
    }
    case "github": {
      const tokens = await githubClient().validateAuthorizationCode(code);
      return fetchGithubUser(tokens);
    }
  }
}

function decodeIdToken(idToken: string): Record<string, unknown> {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("Invalid ID token");
  const payload = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(payload);
}

async function fetchGithubUser(tokens: OAuth2Tokens): Promise<NormalizedOAuthUser> {
  const accessToken = tokens.accessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "PulseOps",
    Accept: "application/vnd.github+json",
  };

  const { data: profile } = await axios.get("https://api.github.com/user", { headers });

  let email: string | null = typeof profile.email === "string" ? profile.email : null;
  if (!email) {
    // The public profile email can be null; fetch the primary verified email.
    const { data: emails } = await axios.get("https://api.github.com/user/emails", { headers });
    const primary = Array.isArray(emails)
      ? emails.find((e: any) => e.primary && e.verified) ?? emails.find((e: any) => e.verified)
      : null;
    email = primary?.email ?? null;
  }

  return {
    providerAccountId: String(profile.id),
    email,
    name: typeof profile.name === "string" ? profile.name : profile.login ?? null,
  };
}
