import { ownPower, PRIVATE_HEADERS, segmentPresenter, segmentRequest, segmentSession, type ClubRow } from "@/lib/segments/query";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await segmentSession();
  if (!session) return Response.json({ error: "Alleen voor ZWB-leden" }, { status: 401, headers: PRIVATE_HEADERS });
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return Response.json({ error: "Ongeldig segment" }, { status: 400, headers: PRIVATE_HEADERS });
  let selection;
  try { selection = segmentRequest(new URL(request.url).searchParams); }
  catch { return Response.json({ error: "Ongeldig tijdstip of doel" }, { status: 400, headers: PRIVATE_HEADERS }); }
  const { data, error } = await session.db.from("zwb_segment_club").select("*").eq("id", id).maybeSingle();
  if (error) return Response.json({ error: "Segment ophalen mislukt" }, { status: 503, headers: PRIVATE_HEADERS });
  if (!data) return Response.json({ error: "Segment niet beschikbaar" }, { status: 404, headers: PRIVATE_HEADERS });
  const detail = await segmentPresenter(session, await ownPower(session), selection.when, selection.target)(data as ClubRow);
  return Response.json(detail, { headers: PRIVATE_HEADERS });
}
