import { useState } from "react";
import { Box, Text } from "ink";
import { resolveConfig, ConfigError, type Config } from "@pulseops/cli/config";
import { PulseOpsClient } from "@pulseops/cli/client";
import { loadCredentials, updateCredentials } from "@pulseops/cli/credentials";
import { App } from "./app.js";
import { Login } from "./login.js";
import { WorkspacePicker } from "./workspace-picker.js";
import { iris } from "./theme.js";

type Boot =
  | { kind: "login"; apiUrl: string }
  | { kind: "pick"; config: Config }
  | { kind: "ready"; config: Config }
  | { kind: "error"; message: string };

/** Decides what to show on launch: login → workspace pick → dashboard. */
function bootstrap(): Boot {
  const creds = loadCredentials();
  const hasKey = Boolean(process.env.PULSEOPS_API_KEY);

  if (!creds && !hasKey) {
    const apiUrl = (
      process.env.PULSEOPS_API_URL ||
      "http://localhost:4000"
    ).replace(/\/+$/, "");
    return { kind: "login", apiUrl };
  }

  let config: Config;
  try {
    config = resolveConfig({});
  } catch (e) {
    return {
      kind: "error",
      message: e instanceof ConfigError ? e.message : String(e),
    };
  }

  if (config.workspaceId == null) {
    if (config.auth.mode === "session") return { kind: "pick", config };
    return {
      kind: "error",
      message: "Set PULSEOPS_WORKSPACE — API keys are scoped to one workspace.",
    };
  }
  return { kind: "ready", config };
}

function makeClient(config: Config): PulseOpsClient {
  return new PulseOpsClient(
    config,
    config.fromStoredSession ? (t) => updateCredentials(t) : undefined,
  );
}

export function Root() {
  const [boot, setBoot] = useState<Boot>(bootstrap);
  const reboot = () => setBoot(bootstrap());

  if (boot.kind === "error") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={2} paddingY={1}>
        <Text color="red">✖ {boot.message}</Text>
        <Text color={iris.muted}>Press Ctrl-C to exit.</Text>
      </Box>
    );
  }

  if (boot.kind === "login") {
    return <Login apiUrl={boot.apiUrl} onDone={reboot} />;
  }

  if (boot.kind === "pick") {
    return (
      <WorkspacePicker
        client={makeClient(boot.config)}
        onPick={(id) => {
          updateCredentials({ workspaceId: id });
          reboot();
        }}
      />
    );
  }

  return <App client={makeClient(boot.config)} config={boot.config} />;
}
