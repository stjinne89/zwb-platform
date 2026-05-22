export type ActiveSession = {
  id: string;
  profileId: string;
  profileName: string;
  mode: "outdoor" | "zwift" | "mywhoosh" | "wahoo_indoor" | "other_indoor";
  status_text: string | null;
  external_track_url: string | null;
  started_at: string;
  last_seen_at: string;
};
