/** Must match the webServer env in playwright.matrix.config.ts (test-only mock admin credentials). */
export const ADMIN_EMAIL = "admin@versus.test";
export const ADMIN_PASSWORD = "Versus-Test-Password-2026!";

/**
 * Replaces the Cloudflare Turnstile script: issues a token at once (the server uses the offline test
 * secret). Like the real widget it also injects the hidden `cf-turnstile-response` field into the
 * parent form (the admin login form reads the token from there).
 */
export const FAKE_TURNSTILE = `
window.turnstile = {
  render(el, opts) {
    setTimeout(() => {
      const form = el.closest("form");
      if (form) {
        let input = form.querySelector('input[name="cf-turnstile-response"]');
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "cf-turnstile-response";
          form.appendChild(input);
        }
        input.value = "e2e-token";
      }
      opts.callback("e2e-token");
    }, 30);
    return "w-" + Math.random();
  },
  remove() {},
  reset() {},
};`;
