import { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { PulseOpsClient } from "../client.js";
import type { Workspace } from "../types.js";
import { ARROW, iris } from "./theme.js";

/** Lists the session user's workspaces and picks one (auto-picks a single one). */
export function WorkspacePicker({
  client,
  onPick,
}: {
  client: PulseOpsClient;
  onPick: (id: number) => void;
}) {
  const { exit } = useApp();
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [sel, setSel] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    client
      .listWorkspaces()
      .then((list) => {
        if (cancelled) return;
        if (list.length === 1) {
          onPick(list[0].id);
          return;
        }
        setWorkspaces(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [client, onPick]);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (!workspaces || workspaces.length === 0) return;
    if (key.upArrow || input === "k") setSel((s) => Math.max(0, s - 1));
    if (key.downArrow || input === "j")
      setSel((s) => Math.min(workspaces.length - 1, s + 1));
    if (key.return) onPick(workspaces[sel].id);
  });

  if (error) {
    return (
      <Box borderStyle="round" borderColor="red" paddingX={2} paddingY={1}>
        <Text color="red">✖ {error}</Text>
      </Box>
    );
  }
  if (!workspaces) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color={iris.muted}>Loading workspaces…</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={iris.cyan}
      paddingX={2}
      paddingY={1}
    >
      <Text color={iris.cyan} bold>
        ◆ Select a workspace
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {workspaces.map((w, i) => (
          <Text key={w.id} color={i === sel ? iris.text : undefined} bold={i === sel}>
            {(i === sel ? ARROW + " " : "  ") + w.name}
            <Text color={iris.muted}>{`  #${w.id} · ${w.role ?? "—"}`}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={iris.muted}>↑/↓ or j/k · enter select · q quit</Text>
      </Box>
    </Box>
  );
}
