import { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { deviceAuthorize, devicePoll, openBrowser, sleep } from "../auth.js";
import { saveCredentials } from "../credentials.js";
import { iris } from "./theme.js";
import { useClock } from "./hooks.js";

type LoginState =
  | { phase: "starting" }
  | { phase: "waiting"; userCode: string; url: string }
  | { phase: "error"; message: string };

/** Runs the device-authorization flow inline, then calls onDone to re-bootstrap. */
export function Login({ apiUrl, onDone }: { apiUrl: string; onDone: () => void }) {
  const { exit } = useApp();
  const [state, setState] = useState<LoginState>({ phase: "starting" });
  const tick = useClock(400);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) exit();
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await deviceAuthorize(apiUrl);
        if (cancelled) return;
        setState({ phase: "waiting", userCode: auth.userCode, url: auth.verificationUri });
        openBrowser(auth.verificationUriComplete);

        const deadline = Date.now() + auth.expiresIn * 1000;
        while (!cancelled && Date.now() < deadline) {
          await sleep(auth.interval * 1000);
          if (cancelled) return;
          const r = await devicePoll(apiUrl, auth.deviceCode);
          if (r.status === "authorized") {
            saveCredentials({
              apiUrl,
              accessToken: r.accessToken,
              refreshToken: r.refreshToken,
              user: r.user ?? undefined,
            });
            if (!cancelled) onDone();
            return;
          }
          if (r.status === "expired") {
            if (!cancelled) setState({ phase: "error", message: "Code expired — restart the app." });
            return;
          }
        }
        if (!cancelled) setState({ phase: "error", message: "Timed out waiting for approval." });
      } catch (e) {
        if (!cancelled) {
          setState({ phase: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, onDone]);

  const dots = ".".repeat((tick % 3) + 1);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={iris.cyan}
      paddingX={2}
      paddingY={1}
    >
      <Text color={iris.cyan} bold>
        ◆ PulseOps · sign in
      </Text>

      {state.phase === "starting" && (
        <Text color={iris.muted}>Starting sign-in{dots}</Text>
      )}

      {state.phase === "waiting" && (
        <Box flexDirection="column">
          <Box marginTop={1}>
            <Text>Open </Text>
            <Text color={iris.cyan}>{state.url}</Text>
            <Text> and enter this code:</Text>
          </Box>
          <Box marginTop={1}>
            <Text bold color={iris.indigo}>
              {"    " + state.userCode}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={iris.muted}>Waiting for approval{dots}  (q to cancel)</Text>
          </Box>
        </Box>
      )}

      {state.phase === "error" && <Text color="red">✖ {state.message}</Text>}
    </Box>
  );
}
