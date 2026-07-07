import { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { CreateMonitorInput, Monitor, MonitorType } from "../types.js";
import { useTheme } from "./theme-context.js";

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
}

const FIELDS: FieldDef[] = [
  { key: "name", label: "name" },
  { key: "type", label: "type", hint: "HTTP | HEARTBEAT" },
  { key: "url", label: "url", hint: "required for HTTP" },
  { key: "method", label: "method", hint: "GET POST PUT PATCH DELETE" },
  { key: "intervalSeconds", label: "interval", hint: "seconds" },
  { key: "timeoutMs", label: "timeout", hint: "ms" },
  { key: "expectedStatus", label: "expect", hint: "HTTP status" },
  { key: "gracePeriodSeconds", label: "grace", hint: "seconds" },
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function defaults(initial?: Monitor): Record<string, string> {
  return {
    name: initial?.name ?? "",
    type: initial?.type ?? "HTTP",
    url: initial?.url ?? "",
    method: initial?.method ?? "GET",
    intervalSeconds: String(initial?.intervalSeconds ?? 60),
    timeoutMs: String(initial?.timeoutMs ?? 5000),
    expectedStatus: String(initial?.expectedStatus ?? 200),
    gracePeriodSeconds: String(initial?.gracePeriodSeconds ?? 60),
  };
}

function validate(v: Record<string, string>): { input?: CreateMonitorInput; error?: string } {
  const name = v.name.trim();
  if (name.length < 2) return { error: "name must be at least 2 characters" };
  const type = v.type.trim().toUpperCase();
  if (type !== "HTTP" && type !== "HEARTBEAT")
    return { error: "type must be HTTP or HEARTBEAT" };
  const url = v.url.trim();
  if (type === "HTTP" && !url) return { error: "HTTP monitors need a url" };
  const method = v.method.trim().toUpperCase();
  if (type === "HTTP" && !METHODS.includes(method))
    return { error: `method must be one of ${METHODS.join(", ")}` };
  const nums: Record<string, number> = {};
  for (const k of ["intervalSeconds", "timeoutMs", "expectedStatus", "gracePeriodSeconds"]) {
    const n = Number(v[k]);
    if (!Number.isFinite(n) || n < 0) return { error: `${k} must be a number` };
    nums[k] = n;
  }
  return {
    input: {
      name,
      type: type as MonitorType,
      url: type === "HTTP" ? url : undefined,
      method: type === "HTTP" ? method : undefined,
      intervalSeconds: nums.intervalSeconds,
      timeoutMs: nums.timeoutMs,
      expectedStatus: nums.expectedStatus,
      gracePeriodSeconds: nums.gracePeriodSeconds,
    },
  };
}

/**
 * A create/edit form for a monitor. Fields are plain text inputs; `type` and
 * `method` are validated against their allowed sets on submit. ↑/↓ or Tab move
 * between fields (they don't clash with TextInput's left/right cursor), Enter
 * advances / submits on the last field, Esc cancels.
 */
export function MonitorForm({
  mode,
  initial,
  busy,
  submitError,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Monitor;
  busy: boolean;
  submitError?: string;
  onSubmit: (input: CreateMonitorInput) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>(() => defaults(initial));
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string>();

  const trySubmit = useMemo(
    () => () => {
      const { input, error: e } = validate(values);
      if (e) {
        setError(e);
        return;
      }
      setError(undefined);
      onSubmit(input!);
    },
    [values, onSubmit],
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.tab || key.downArrow) {
      setIdx((i) => (i + 1) % FIELDS.length);
    } else if (key.upArrow) {
      setIdx((i) => (i - 1 + FIELDS.length) % FIELDS.length);
    } else if (key.ctrl && input === "s") {
      trySubmit();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.cyan}
      paddingX={2}
      paddingY={1}
    >
      <Text color={theme.cyan} bold>
        {mode === "create" ? "◆ New monitor" : `◆ Edit monitor #${initial?.id}`}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {FIELDS.map((f, i) => {
          const active = i === idx;
          return (
            <Box key={f.key}>
              <Text color={active ? theme.cyan : theme.muted}>
                {(active ? "▸ " : "  ") + f.label.padEnd(10)}
              </Text>
              <Box width={30}>
                <TextInput
                  value={values[f.key]}
                  focus={active && !busy}
                  onChange={(val) => setValues((s) => ({ ...s, [f.key]: val }))}
                  onSubmit={() => {
                    if (i === FIELDS.length - 1) trySubmit();
                    else setIdx(i + 1);
                  }}
                />
              </Box>
              {f.hint ? <Text color={theme.muted}>{f.hint}</Text> : null}
            </Box>
          );
        })}
      </Box>
      {error || submitError ? (
        <Box marginTop={1}>
          <Text color="red">✖ {error ?? submitError}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color={theme.muted}>
          {busy ? "saving…" : "↑/↓ or Tab move · Enter next/submit · ⌃s save · Esc cancel"}
        </Text>
      </Box>
    </Box>
  );
}

/** A y/n confirmation modal. `y`/Enter confirms, `n`/Esc cancels. */
export function ConfirmDialog({
  message,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  message: string;
  danger?: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  useInput((input, key) => {
    if (busy) return;
    if (input === "y" || key.return) onConfirm();
    else if (input === "n" || key.escape) onCancel();
  });
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={danger ? "red" : theme.cyan}
      paddingX={2}
      paddingY={1}
    >
      <Text color={danger ? "red" : theme.text}>{message}</Text>
      <Box marginTop={1}>
        <Text color={theme.muted}>{busy ? "working…" : "y confirm · n cancel"}</Text>
      </Box>
    </Box>
  );
}
