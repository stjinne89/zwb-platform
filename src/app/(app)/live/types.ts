export type ActiveSession = {
  id: string;
  profileId: string;
  profileName: string;
  mode: "outdoor" | "zwift" | "mywhoosh" | "wahoo_indoor" | "other_indoor";
  source: "manual" | "owntracks" | "external" | "garmin" | "wahoo";
  status_text: string | null;
  external_track_url: string | null;
  started_at: string;
  last_seen_at: string;
};

/** Laatste koppeling van een lid in live_tracker_tokens (Garmin-mail, Wahoo-link). */
export type TrackerTokenStatus = {
  id: string;
  enabled: boolean;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

/** Laatste sensorwaarden van een renner, voor het uitklappaneel op het bord. */
export type RiderStats = {
  recordedAt: string;
  rideStartAt: string;
  speedKmh: number | null;
  powerW: number | null;
  cadenceRpm: number | null;
  heartRate: number | null;
  distanceM: number | null;
};
