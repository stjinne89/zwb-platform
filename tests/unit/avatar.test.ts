import { describe, expect, it } from "vitest";
import { avatarPhoto, isKopmanAvatar, kopmanAvatarUrl, memberAvatar, stravaAvatarPatch } from "@/lib/avatar";

const ID = "00000000-0000-4000-8000-000000000001";
const PHOTO = "https://example.supabase.co/storage/v1/object/public/avatars/x/avatar-1.jpg";
const STRAVA = "https://dgalywyr863hv.cloudfront.net/pictures/athletes/1/large.jpg";

describe("memberAvatar", () => {
  it("houdt een foto, en geeft zonder foto de kopman", () => {
    expect(memberAvatar(ID, PHOTO)).toBe(PHOTO);
    expect(memberAvatar(ID, null)).toBe(`/live/kopman/${ID}`);
    expect(memberAvatar(null, null)).toBeNull();
  });

  it("de kopman met een versie mag eeuwig in de cache", () => {
    expect(kopmanAvatarUrl(ID, 5)).toBe(`/live/kopman/${ID}?v=5`);
    expect(isKopmanAvatar(kopmanAvatarUrl(ID, 5))).toBe(true);
    expect(isKopmanAvatar(PHOTO)).toBe(false);
    expect(isKopmanAvatar(null)).toBe(false);
  });
});

describe("avatarPhoto", () => {
  it("vindt de foto, ook achter de kopman", () => {
    expect(avatarPhoto({ avatar_url: PHOTO })).toBe(PHOTO);
    expect(avatarPhoto({ avatar_url: kopmanAvatarUrl(ID, 1), avatar_photo_url: PHOTO })).toBe(PHOTO);
    expect(avatarPhoto({ avatar_url: kopmanAvatarUrl(ID, 1) })).toBeNull();
    expect(avatarPhoto(null)).toBeNull();
  });
});

describe("stravaAvatarPatch", () => {
  it("vult een lege avatar en vervangt een eerdere Strava-foto", () => {
    expect(stravaAvatarPatch({ avatar_url: null }, STRAVA)).toEqual({ avatar_url: STRAVA });
    expect(stravaAvatarPatch(null, STRAVA)).toEqual({ avatar_url: STRAVA });
    expect(stravaAvatarPatch({ avatar_url: STRAVA }, STRAVA)).toEqual({ avatar_url: STRAVA });
  });

  it("laat een eigen upload staan", () => {
    expect(stravaAvatarPatch({ avatar_url: PHOTO }, STRAVA)).toEqual({});
  });

  it("bewaart de foto achter de kopman, zonder de kopman te vervangen", () => {
    const kopman = kopmanAvatarUrl(ID, 1);
    expect(stravaAvatarPatch({ avatar_url: kopman, avatar_photo_url: null }, STRAVA)).toEqual({ avatar_photo_url: STRAVA });
    expect(stravaAvatarPatch({ avatar_url: kopman, avatar_photo_url: PHOTO }, STRAVA)).toEqual({});
  });
});
