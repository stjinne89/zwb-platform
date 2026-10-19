// Verzonnen clubdata voor de instructievideo. Geen enkele naam of waarde hoort
// bij een echt lid; zo kan de opname zonder vervagen gedeeld worden.

const PRIVACY_VERSION = "2026-09-30";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

const OTHER_MEMBERS = [
  ["Ruben Verhoeven", "Breda"],
  ["Lotte Janssens", "Tilburg"],
  ["Mark van Dijk", "Roosendaal"],
  ["Femke Bakker", "Bergen op Zoom"],
  ["Joris Peeters", "Etten-Leur"],
  ["Ilse de Graaf", "Oosterhout"],
  ["Bram Willems", "Breda"],
  ["Noor Hendriks", "Dongen"],
].map(([name, region], i) => ({
  id: `00000000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`,
  display_name: name,
  region,
  bio: null,
  avatar_url: null,
  zwift_id: String(4100000 + i * 137),
  zrl_category: ["B", "C", "C", "D", "B", "C", "A", "D"][i],
  is_approved: true,
  is_admin: false,
  community_roles: [],
  sex: null,
  privacy_accepted_at: "2026-09-30T10:00:00Z",
  privacy_accepted_version: PRIVACY_VERSION,
  created_at: "2026-03-01T10:00:00Z",
}));

function demoProfile(preset) {
  const base = {
    id: DEMO_USER_ID,
    display_name: "Sanne de Vries",
    region: null,
    bio: null,
    avatar_url: null,
    zwift_id: null,
    zwift_opt_out: false,
    zrl_category: null,
    is_approved: preset !== "nieuw",
    is_admin: false,
    community_roles: [],
    sex: null,
    privacy_accepted_at: "2026-10-16T09:00:00Z",
    privacy_accepted_version: PRIVACY_VERSION,
    created_at: "2026-10-16T09:00:00Z",
  };
  if (preset === "profiel") base.zwift_id = "4123456";
  if (preset === "compleet") {
    Object.assign(base, {
      region: "Breda",
      bio: "Fiets graag in het weekend en rijd door de week op Zwift.",
      zwift_id: "4123456",
      zrl_category: "C",
    });
  }
  return base;
}

const EVENT_IDS = [1, 2, 3].map((n) => `e0000000-0000-4000-8000-00000000000${n}`);

function inDays(days, hour = 19, minute = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * `design: "tegels"`: het nieuwe design staat achter het recht
 * roles.manage_permissions. Een lid zonder rol telt als community_member, dus
 * alleen hier in de nep-database krijgt die rol dat ene recht; het demolid
 * blijft verder een gewoon lid.
 */
export function buildState(preset, { design = "klassiek" } = {}) {
  const profile = demoProfile(preset);
  const user = {
    id: DEMO_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "sanne@voorbeeld.nl",
    email_confirmed_at: "2026-10-16T09:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: profile.display_name },
    created_at: "2026-10-16T09:00:00Z",
  };

  return {
    preset,
    users: [user],
    tables: {
      profiles: [profile, ...OTHER_MEMBERS],
      community_role_permissions:
        design === "tegels" ? [{ role: "community_member", permissions: ["roles.manage_permissions"] }] : [],
      strava_connections: [],
      intervals_connections: [],
      push_subscriptions: [],
      live_tracker_tokens: [],
      strava_bikes: [],
      strava_activities: [],
      roster_entries: [],
      events: [
        {
          id: EVENT_IDS[0],
          type: "social",
          kind: null,
          title: "Dinsdagavond clubrit op Zwift",
          description: "Rustige groepsrit voor iedereen, we wachten op elkaar. Na afloop even napraten op Discord.",
          start_at: inDays(1, 19, 30),
          end_at: inDays(1, 20, 45),
          location: "Zwift · Watopia",
          distance_km: 35,
          elevation_m: 280,
          parent_event_id: null,
          cover_image_path: null,
          created_by: OTHER_MEMBERS[0].id,
          created_at: "2026-10-01T10:00:00Z",
        },
        {
          id: EVENT_IDS[1],
          type: "outdoor",
          kind: "social",
          title: "Zondagochtend buitenrit vanuit Breda",
          description: "Rondje van zo'n 70 km door de Baronie met koffiestop halverwege. Tempo rond de 27 km/u.",
          start_at: inDays(5, 9, 0),
          end_at: inDays(5, 12, 0),
          location: "Breda, Grote Markt",
          start_lat: 51.5887,
          start_lon: 4.7759,
          distance_km: 70,
          elevation_m: 120,
          parent_event_id: null,
          cover_image_path: null,
          created_by: OTHER_MEMBERS[2].id,
          created_at: "2026-10-01T10:00:00Z",
        },
        {
          id: EVENT_IDS[2],
          type: "training",
          kind: "training",
          title: "Intervaltraining: sweet spot",
          description: "Samen 3 x 12 minuten sweet spot op Zwift.",
          start_at: inDays(8, 20, 0),
          end_at: inDays(8, 21, 0),
          location: "Zwift · Makuri Islands",
          distance_km: 30,
          elevation_m: 150,
          parent_event_id: null,
          cover_image_path: null,
          created_by: OTHER_MEMBERS[4].id,
          created_at: "2026-10-01T10:00:00Z",
        },
      ],
      event_rsvps: [
        ...[0, 1, 3, 5, 6].map((i) => ({ event_id: EVENT_IDS[0], profile_id: OTHER_MEMBERS[i].id, status: "yes" })),
        ...[1, 2, 4, 7].map((i) => ({ event_id: EVENT_IDS[1], profile_id: OTHER_MEMBERS[i].id, status: "yes" })),
        ...[4, 5].map((i) => ({ event_id: EVENT_IDS[2], profile_id: OTHER_MEMBERS[i].id, status: "yes" })),
      ],
    },
    rpc: {
      rate_limit_hit: true,
    },
  };
}
