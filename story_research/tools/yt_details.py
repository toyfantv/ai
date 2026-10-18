"""Publish date, description and top comments for a channel's top and newest Shorts.

Top comments are the best way to learn what happens in a Short without watching it: viewers quote the lines and
explain the joke. (The video player API needs a login, so lengths aren't available this way.)

    python -I yt_details.py <shorts.json from yt_shorts.py> <out.json> [top=80] [with_comments=45] [newest=40]
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from yt_shorts import call, walk


def details(vid, n=25):
    d = call("next", {"videoId": vid})
    info = {"publish": next((v.get("simpleText") for v in walk(d, "publishDate")), ""),
            "desc": next((v.get("content", "") for v in walk(d, "attributedDescription")), "")[:300],
            "comments": []}
    tok = next((c["token"] for r in walk(d, "continuationItemRenderer") for c in walk(r, "continuationCommand")), None)
    if n and tok:
        c = call("next", {"continuation": tok})
        for p in walk(c, "commentEntityPayload"):
            txt = p.get("properties", {}).get("content", {}).get("content", "")
            likes = p.get("toolbar", {}).get("likeCountNotliked", "").strip() or "0"
            info["comments"].append(f"[{likes}] {txt[:220]}")
            if len(info["comments"]) >= n:
                break
    return info


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    top, with_comments, newest = (int(a) for a in (sys.argv[3:] + ["80", "45", "40"][len(sys.argv[3:]):]))
    allv = json.load(open(src))
    picked = sorted(allv, key=lambda x: -(x["views"] or 0))[:top]
    picked += [x for x in allv[:newest] if x not in picked]
    res = []
    for i, x in enumerate(picked):
        try:
            x.update(details(x["id"], 25 if i < with_comments or i >= top else 0))
        except SystemExit:
            x["error"] = True
        res.append(x)
        json.dump(res, open(out, "w"), indent=1, ensure_ascii=False)
    print(len(res), "videos")
