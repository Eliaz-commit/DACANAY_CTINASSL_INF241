import React, { useState } from "react";
import { BadgeCheck, CircleAlert, FileCheck2, Footprints, MapPin, Mountain, Tent } from "lucide-react";
import "./auth.css";

export function Auth({ onBack, onSubmit, onForgot, onReset, onGoogle, busy, error, notice, resetToken, initialRole = "hiker" }) {
  const [mode, setMode] = useState(resetToken ? "reset" : "signin");
  const [role, setRole] = useState(initialRole);
  const operator = role === "operator";
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const signup = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return (
    <div className="auth-page">
      <header className="auth-site-header">
        <div className="auth-site-header-inner">
          <button className="auth-brand" type="button" onClick={onBack} aria-label="AkyatPH home">
            <span className="auth-brand-mark"><Mountain size={17} aria-hidden="true" /></span>AkyatPH
          </button>
          <nav aria-label="Site navigation">
            <button type="button" onClick={onBack}>Discover</button>
            <button type="button" onClick={onBack}>For operators</button>
            <span className="auth-header-current">Sign in</span>
          </nav>
        </div>
      </header>
      <main className="auth-content">
        <div className="auth-sheet">
          <section className="auth-image" aria-label="Mt. Pulag">
            <div className="auth-image-shade" />
            <div className="auth-image-content">
              <span className="auth-location"><MapPin size={14} aria-hidden="true" />Mt. Pulag · Benguet</span>
              <div className="auth-image-copy">
                <h2>Plan the climb. Keep every detail in view.</h2>
                <p>Book with verified operators and follow your permit from LGU endorsement to cleared, without leaving your account.</p>
                <ul><li><BadgeCheck size={16} aria-hidden="true" />Verified tour operators</li><li><FileCheck2 size={16} aria-hidden="true" />Permit progress in one place</li></ul>
              </div>
            </div>
          </section>
          <section className="auth-form-panel" aria-label="Account access">
            <div className="auth-form-inner">
              <div className="auth-heading"><h1>{mode === "forgot" ? "Reset your password." : mode === "reset" ? "Choose a new password." : signup ? (operator ? "Create your operator account." : "Create your account.") : "Welcome back."}</h1><p>{mode === "forgot" ? "Enter your account email. For this local activity, the reset link appears in the API terminal." : mode === "reset" ? "Your new password must have at least 8 characters." : signup ? (operator ? "Publish your departures and see hikers' bookings land in your operator portal." : "Book guided climbs and keep every trip detail together.") : "Sign in to book climbs, or to manage your trips as an operator."}</p></div>
              {(mode === "signin" || signup) && <div className="auth-tabs" role="group" aria-label="Choose an account action">
                <button type="button" aria-pressed={!signup} className={!signup ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
                <button type="button" aria-pressed={signup} className={signup ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
              </div>}
              {(mode === "signin" || signup) && <><button type="button" className="auth-google" onClick={() => onGoogle(role)}><GoogleMark />Continue with Google</button><div className="auth-divider">or with email</div></>}
              <form onSubmit={(event) => { event.preventDefault(); if (mode === "forgot") onForgot(form.email); else if (mode === "reset") onReset(resetToken, form.password); else onSubmit(signup ? { ...form, role } : { email: form.email, password: form.password }, signup); }}>
                {signup && <fieldset className="auth-roles"><legend>I want to</legend>
                  <label className={!operator ? "active" : ""}><input type="radio" name="role" value="hiker" checked={!operator} onChange={() => setRole("hiker")} /><Footprints size={18} aria-hidden="true" /><span><strong>Book climbs</strong><small>Hiker account</small></span></label>
                  <label className={operator ? "active" : ""}><input type="radio" name="role" value="operator" checked={operator} onChange={() => setRole("operator")} /><Tent size={18} aria-hidden="true" /><span><strong>Run tours</strong><small>Operator account</small></span></label>
                </fieldset>}
                {signup && <div className="auth-field"><label htmlFor="auth-name">{operator ? "Your name" : "Full name"}</label><input id="auth-name" name="name" autoComplete="name" value={form.name} onChange={update} maxLength={80} required /></div>}
                {mode !== "reset" && <div className="auth-field"><label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={update} maxLength={254} required /></div>}
                {mode !== "forgot" && <div className="auth-field"><div className="auth-field-heading"><label htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}</label>{mode === "signin" && <button type="button" onClick={() => setMode("forgot")}>Forgot password?</button>}</div><input id="auth-password" name="password" type="password" autoComplete={signup || mode === "reset" ? "new-password" : "current-password"} value={form.password} onChange={update} minLength={8} maxLength={128} required />{(signup || mode === "reset") && <span className="auth-hint">Use at least 8 characters.</span>}</div>}
                {error && <p className="auth-error" role="alert"><CircleAlert size={16} aria-hidden="true" />{error}</p>}
                {notice && <p className="auth-notice" role="status">{notice}</p>}
                <button className="auth-submit" disabled={busy} aria-busy={busy} type="submit">{busy ? "One moment…" : mode === "forgot" ? "Get reset link" : mode === "reset" ? "Save new password" : signup ? "Create account" : "Sign in"}</button>
              </form>
              {(mode === "forgot" || mode === "reset") && <button type="button" className="auth-return" onClick={() => { window.history.replaceState(null, "", "/"); setMode("signin"); }}>Back to sign in</button>}
              <p className="auth-note">See how AkyatPH handles your details in the <button type="button" onClick={() => setPrivacyOpen(true)}>privacy notice</button>.</p>
            </div>
          </section>
        </div>
      </main>
      <footer className="auth-footer"><div><span><Mountain size={18} aria-hidden="true" />AkyatPH</span><p>Guided climbs by verified operators in the Philippines, with permits tracked from LGU endorsement to cleared.</p></div><div><strong>For hikers</strong><button onClick={onBack}>Discover trails</button></div><div><strong>For operators</strong><button onClick={onBack}>Operator portal</button></div></footer>
      {privacyOpen && <div className="auth-privacy-overlay" role="presentation" onClick={() => setPrivacyOpen(false)}><section className="auth-privacy-dialog" role="dialog" aria-modal="true" aria-label="Privacy notice" onClick={(event) => event.stopPropagation()}><button className="auth-privacy-close" onClick={() => setPrivacyOpen(false)} aria-label="Close privacy notice">×</button><h2>Privacy notice</h2><p>This local classroom app stores your name, email address, password hash, sessions, and trips in your configured MongoDB database. Passwords are never stored as plain text. The app does not send email; password reset links appear in the local API terminal. If you choose Google sign-in, Google shares your verified name and email with this app. Delete the local database to remove its stored data.</p><button className="auth-submit" onClick={() => setPrivacyOpen(false)}>Close</button></section></div>}
    </div>
  );
}

function GoogleMark() { return <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>; }
