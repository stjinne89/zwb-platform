import { ownPower, PRIVATE_HEADERS, segmentPresenter, segmentRequest, segmentSession, type ClubRow } from "@/lib/segments/query";

export async function GET(request: Request) {
  const session = await segmentSession();
  if (!session) return Response.json({ error: "Alleen voor ZWB-leden" }, { status: 401, headers: PRIVATE_HEADERS });
  const params = new URL(request.url).searchParams;
  let when: Date, target: "record" | "podium", bounds: number[], offset: number, zoom: number, min: number, max: number, grade: number;
  try {
    ({ when, target } = segmentRequest(params));
    bounds = (params.get("bounds") ?? "-90,-180,90,180").split(",").map(Number);
    offset = Number(params.get("offset") ?? 0); zoom = Number(params.get("zoom") ?? 8);
    min = Number(params.get("min") ?? 0); max = Number(params.get("max") ?? 1000000); grade = Number(params.get("grade") ?? -100);
    if (bounds.length !== 4 || ![...bounds, offset, zoom, min, max, grade].every(Number.isFinite) || bounds[0] < -90 || bounds[2] > 90 || bounds[1] < -180 || bounds[3] > 180 || bounds[0] > bounds[2] || bounds[1] > bounds[3] || !Number.isInteger(offset) || offset < 0 || offset > 1000000 || min < 0 || max < min || max > 1000000 || zoom < 0 || zoom > 20 || grade < -100 || grade > 100) throw new Error("Ongeldige filters");
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Ongeldige filters" }, { status: 400, headers: PRIVATE_HEADERS }); }
  try {
    const search = (params.get("q") ?? "").slice(0, 100), own = params.get("own") === "true";
    let query = session.db.from("zwb_segment_club").select("*").lte("south", bounds[2]).gte("north", bounds[0]).lte("west", bounds[3]).gte("east", bounds[1])
      .gte("distance_m", min).lte("distance_m", max).gte("average_grade", grade).order("name").order("id").range(offset, offset + 39);
    if (search) query = query.ilike("name", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
    if (own) query = query.contains("rider_ids", [session.user.id]);
    const [rows, clusters, curve] = await Promise.all([
      query,
      session.db.rpc("segment_map_clusters", { p_south: bounds[0], p_west: bounds[1], p_north: bounds[2], p_east: bounds[3], p_cell: Math.max(0.02, 360 / 2 ** (Math.floor(zoom) + 1)), p_search: search, p_own: own, p_min: min, p_max: max, p_grade: grade }),
      ownPower(session),
    ]);
    if (rows.error || clusters.error) throw new Error("Segmentkaart nog niet beschikbaar.");
    const present = segmentPresenter(session, curve, when, target);
    // Four at a time bounds both weather concurrency and memory.
    const items = [];
    for (let i = 0; i < (rows.data ?? []).length; i += 4) {
      const details = await Promise.all((rows.data ?? []).slice(i, i + 4).map((r) => present(r as ClubRow)));
      items.push(...details.map(({ leaderboard: _board, hazardous: _hazard, ...item }) => { void _board; void _hazard; return item; }));
    }
    const status = params.get("status");
    return Response.json({ items: status ? items.filter((item) => item.assessment.status === status) : items, nextOffset: rows.data?.length === 40 ? offset + 40 : null, clusters: status ? [] : clusters.data ?? [] }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Segmenten ophalen mislukt" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
