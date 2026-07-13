import { render } from "ink";
import type { ConfigOverrides } from "../config.js";
import { Root } from "./root.js";

// Terminal control sequences for a btop-style full-screen app: switch to the
// alternate screen buffer (so the dashboard owns the whole window and the
// user's scrollback is untouched) and hide the real cursor (Ink/ink-text-input
// draw their own).
const ENTER_ALT = "\x1b[?1049h";
const LEAVE_ALT = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

/**
 * Boots the live terminal dashboard full-screen and resolves when the user
 * exits it. Imported dynamically from the CLI entry so Ink/React are only
 * loaded when the dashboard is actually launched.
 */
export async function launchTui(overrides: ConfigOverrides = {}): Promise<void> {
  const out = process.stdout;
  const tty = Boolean(out.isTTY);

  let restored = false;
  const restore = () => {
    if (restored || !tty) return;
    restored = true;
    out.write(SHOW_CURSOR + LEAVE_ALT);
  };

  if (tty) out.write(ENTER_ALT + HIDE_CURSOR);
  // Belt-and-braces: restore the terminal even on a hard exit / signal.
  process.once("exit", restore);
  process.once("SIGTERM", () => {
    restore();
    process.exit(0);
  });

  try {
    const { waitUntilExit } = render(<Root overrides={overrides} />);
    await waitUntilExit();
  } finally {
    restore();
  }
}
