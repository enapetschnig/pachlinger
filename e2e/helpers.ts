// Test-User-Helfer: nutzt die Supabase Management API + Auth-Admin um
// für jeden Lauf frische User anzulegen und nachher aufzuräumen.
//
// Zugangsdaten kommen aus ENV-Variablen — nichts wird ins Repo committed.
// Lokal vor `npx playwright test` setzen:
//   export SUPABASE_MGMT_TOKEN=sbp_…
//   export SUPABASE_SERVICE_ROLE=eyJ…

const SUPABASE_URL = "https://jyjhtqnkirsxyzsnwlmx.supabase.co";
const PROJECT_REF = "jyjhtqnkirsxyzsnwlmx";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;

if (!SERVICE_ROLE || !MGMT_TOKEN) {
  throw new Error(
    "E2E benötigt SUPABASE_SERVICE_ROLE und SUPABASE_MGMT_TOKEN als ENV-Variablen.",
  );
}

async function mgmtQuery(sql: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MGMT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  return res.json();
}

export async function createTestUser(opts: {
  email: string;
  password: string;
  vorname: string;
  nachname: string;
  role?: "administrator" | "mitarbeiter";
  active?: boolean;
}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { vorname: opts.vorname, nachname: opts.nachname },
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error("createTestUser failed: " + JSON.stringify(data));
  const uid = data.id as string;

  if (opts.active !== false) {
    await mgmtQuery(`UPDATE public.profiles SET is_active=true WHERE id='${uid}';`);
  }
  if (opts.role === "administrator") {
    await mgmtQuery(
      `DELETE FROM public.user_roles WHERE user_id='${uid}'; INSERT INTO public.user_roles (user_id, role) VALUES ('${uid}', 'administrator');`,
    );
  }
  return uid;
}

export async function deleteTestUser(uid: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
  });
}

export async function cleanupLieferscheineFor(uid: string) {
  await mgmtQuery(`DELETE FROM public.lieferscheine WHERE user_id='${uid}';`);
}

export async function cleanupKundenBy(uid: string) {
  await mgmtQuery(`DELETE FROM public.kunden WHERE created_by='${uid}';`);
}
