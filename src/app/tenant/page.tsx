"use client";

import { useEffect, useMemo, useState } from "react";

type TenantSession = {
  id: number;
  name: string;
  email: string;
  rentUnitId?: number | null;
  emailReminders?: boolean;
};

type TenantDashboard = {
  tenant: TenantSession;
  unit: { id: number; unit: string; rent: number; status: string };
  property: { id: number | null; name: string };
  rollup: { paid: number; balance: number; dueDate: string; lateFee: number; totalDue: number };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

export default function TenantPortalPage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<TenantSession | null>(null);
  const [dashboard, setDashboard] = useState<TenantDashboard | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testReminderType, setTestReminderType] = useState("test");

  const loadSession = async () => {
    const res = await fetch("/api/tenant/auth/me");
    if (!res.ok) {
      setSession(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSession(data.tenant || null);
  };

  const loadDashboard = async () => {
    const res = await fetch("/api/tenant/dashboard");
    if (!res.ok) {
      setDashboard(null);
      return;
    }
    const data = await res.json();
    setDashboard(data || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (session) {
      loadDashboard();
    }
  }, [session]);

  const handleLogin = async () => {
    setError(null);
    setStatus(null);
    const res = await fetch("/api/tenant/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
      return;
    }
    const data = await res.json();
    setSession(data.tenant || null);
    setLoginForm({ email: "", password: "" });
  };

  const handleLogout = async () => {
    await fetch("/api/tenant/auth/logout", { method: "POST" });
    setSession(null);
    setDashboard(null);
  };

  const handleSaveSettings = async (emailReminders: boolean) => {
    setError(null);
    setStatus(null);
    const res = await fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailReminders }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to update settings");
      return;
    }
    const data = await res.json();
    setSession((prev) => (prev ? { ...prev, emailReminders: data.tenant?.emailReminders } : prev));
    setStatus("Settings updated.");
  };

  const handleChangePassword = async () => {
    setError(null);
    setStatus(null);
    const res = await fetch("/api/tenant/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to update password");
      return;
    }
    setPasswordForm({ currentPassword: "", newPassword: "" });
    setStatus("Password updated.");
  };

  const handleTestReminder = async () => {
    setError(null);
    setStatus(null);
    const params = new URLSearchParams({
      force: "1",
      type: testReminderType,
    });
    if (session?.id) params.set("tenantId", String(session.id));
    if (session?.rentUnitId) params.set("rentUnitId", String(session.rentUnitId));
    const res = await fetch(`/api/tenant/reminders/run?${params.toString()}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to send reminder.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setStatus(`Reminder sent (${data.sent ?? 0}).`);
  };

  const dueStatus = useMemo(() => {
    if (!dashboard) return null;
    const dueDate = dashboard.rollup.dueDate;
    const daysUntil = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntil === 0) return "Due today";
    if (daysUntil > 0) return `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
    return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`;
  }, [dashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-2xl font-semibold mb-2">Tenant Portal</h1>
          <p className="text-sm text-slate-400 mb-6">Sign in to view your rent balance and reminders.</p>
          {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <button
              onClick={handleLogin}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
          <div className="text-sm text-slate-400">{session.email}</div>
        </div>
        <button onClick={handleLogout} className="text-sm text-slate-300 hover:text-white">
          Log out
        </button>
      </div>

      {dashboard ? (
        <div className="max-w-3xl mx-auto px-4 pb-10 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <div className="text-sm text-slate-400">{dashboard.property.name} • {dashboard.unit.unit}</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs uppercase text-slate-500">Total Due</div>
                <div className="text-2xl font-semibold">{formatCurrency(dashboard.rollup.totalDue)}</div>
                <div className="text-xs text-slate-400 mt-1">{dueStatus}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs uppercase text-slate-500">Late Fees</div>
                <div className="text-2xl font-semibold">{formatCurrency(dashboard.rollup.lateFee)}</div>
                <div className="text-xs text-slate-400 mt-1">Rent: {formatCurrency(dashboard.unit.rent)}</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Next due date: <span className="text-slate-200">{dashboard.rollup.dueDate}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Email reminders</div>
                <div className="text-xs text-slate-400">7/3/1 days before due, plus late-fee alerts.</div>
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(session.emailReminders)}
                  onChange={(e) => handleSaveSettings(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <span className="text-xs text-slate-300">Enabled</span>
              </label>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dev test only</span>
              <div className="flex items-center gap-2">
                <select
                  value={testReminderType}
                  onChange={(e) => setTestReminderType(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="test">Test</option>
                  <option value="due-7">Due in 7 days</option>
                  <option value="due-3">Due in 3 days</option>
                  <option value="due-1">Due in 1 day</option>
                  <option value="late-fee">Late Fee Applied</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button
                  onClick={handleTestReminder}
                  className="rounded-lg bg-slate-200 text-slate-900 px-3 py-1.5 text-[11px] font-semibold hover:bg-white"
                >
                  Send Test Reminder
                </button>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-4">
              <div className="text-sm font-semibold mb-2">Change password</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleChangePassword}
                className="mt-3 rounded-lg bg-slate-200 text-slate-900 px-4 py-2 text-xs font-semibold hover:bg-white"
              >
                Update Password
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
          {status && <div className="text-sm text-emerald-300">{status}</div>}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            Tenant account is not linked to a rent unit yet.
          </div>
        </div>
      )}
    </div>
  );
}
