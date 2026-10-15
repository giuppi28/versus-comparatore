import path from "node:path";

/** Mock-admin session written by global-setup.ts (inside the git-ignored test-results folder). */
export const ADMIN_STATE_FILE = path.join(__dirname, "../../test-results/.matrix-admin-state.json");

/** Where the T7.6 screenshots go. */
export const SHOTS_DIR = path.join(__dirname, "../screenshots");
