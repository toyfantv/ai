"""List every Short on a YouTube channel with its view count.

Uses YouTube's own public data API (InnerTube, logged out), so it works when the cloud environment allows
youtubei.googleapis.com even if www.youtube.com is blocked. Notes only: never downloads videos.

    python -I yt_shorts.py <channel_id UC...> <out.json>

Output: a list, newest first: {id, title, views_text, views, rank_latest}. Find the channel id in any search
result link (youtube.com/channel/UC...) or in the API response for the @handle.
"""
import json, re, sys, time, urllib.request

API = "https://youtubei.googleapis.com/youtubei/v1/"
CTX = {"client": {"clientName": "WEB", "clientVersion": "2.20251010.01.00", "hl": "en", "gl": "US"}}
SHORTS_TAB = "EgZzaG9ydHPyBgUKA5oBAA%3D%3D"


def call(ep, body):
    body = dict(body, context=CTX)
    req = urllib.request.Request(API + ep + "?prettyPrint=false", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            print("retry", ep, e, file=sys.stderr)
            time.sleep(2 ** i)
    raise SystemExit("failed: " + ep)


def walk(o, key):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key:
                yield v
            yield from walk(v, key)
    elif isinstance(o, list):
        for i in o:
            yield from walk(i, key)


def views(t):
    m = re.search(r"([\d.,]+)\s*(thousand|million|billion|K|M|B)?\s*views?", t, re.I)
    if not m:
        return None
    mul = {"thousand": 1e3, "k": 1e3, "million": 1e6, "m": 1e6, "billion": 1e9, "b": 1e9}
    return int(float(m.group(1).replace(",", "")) * mul.get((m.group(2) or "").lower(), 1))


def items(d):
    out = []
    for v in walk(d, "shortsLockupViewModel"):
        acc = v.get("accessibilityText", "")
        meta = v.get("overlayMetadata", {})
        out.append({"id": next(walk(v, "videoId"), None),
                    "title": meta.get("primaryText", {}).get("content") or acc.rsplit(",", 1)[0],
                    "views_text": meta.get("secondaryText", {}).get("content", ""),
                    "views": views(acc) or views(meta.get("secondaryText", {}).get("content", ""))})
    return out


def conts(d):
    # only the grid's own "load more" item, not the sort / filter chips
    grid = list(walk(d, "richGridRenderer")) + list(walk(d, "appendContinuationItemsAction"))
    return [c["token"] for g in grid for r in walk(g, "continuationItemRenderer")
            for c in walk(r, "continuationCommand")]


def channel_header(d):
    rows = next(walk(d, "contentMetadataViewModel"), {}).get("metadataRows", [])
    return [p.get("text", {}).get("content") for r in rows for p in r.get("metadataParts", [])]


if __name__ == "__main__":
    cid, out = sys.argv[1], sys.argv[2]
    d = call("browse", {"browseId": cid, "params": SHORTS_TAB})
    print("channel:", channel_header(d))
    allv, seen = [], set()

    def add(lst):
        for x in lst:
            if x["id"] and x["id"] not in seen:
                seen.add(x["id"])
                x["rank_latest"] = len(allv)
                allv.append(x)

    add(items(d))
    tok, pages = (conts(d) or [None])[-1], 0
    while tok and pages < 100:
        d = call("browse", {"continuation": tok})
        before = len(allv)
        add(items(d))
        pages += 1
        tok = (conts(d) or [None])[-1]
        if len(allv) == before:
            break
    json.dump(allv, open(out, "w"), indent=1, ensure_ascii=False)
    print(len(allv), "shorts,", pages, "pages")
