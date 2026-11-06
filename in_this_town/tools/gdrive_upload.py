#!/usr/bin/env python3
"""Upload finished videos to Google Drive as the user (scope: drive.file).

  python tools/gdrive_upload.py output/InThisTown_Episode06_OceanSky.mp4 [more files...]

Needs environment variables GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN
(OAuth client + refresh token; see README "Google Drive"). Files go into a Drive folder named
$GDRIVE_FOLDER (default "In This Town videos"), which this tool creates on first use. With the
drive.file scope it can only see files and folders it created itself.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

FOLDER = os.environ.get("GDRIVE_FOLDER", "In This Town videos")
UA = {"User-Agent": "itt-uploader/1.0"}


def req(method, url, data=None, headers=None):
    r = urllib.request.Request(url, data, {**UA, **(headers or {})}, method=method)
    with urllib.request.urlopen(r, timeout=300) as resp:
        body = resp.read()
        return resp, (json.loads(body) if body and resp.headers.get_content_type() == "application/json" else body)


def token():
    for k in ("GDRIVE_CLIENT_ID", "GDRIVE_CLIENT_SECRET", "GDRIVE_REFRESH_TOKEN"):
        if not os.environ.get(k):
            sys.exit(f"missing {k}")
    data = urllib.parse.urlencode({"client_id": os.environ["GDRIVE_CLIENT_ID"],
                                   "client_secret": os.environ["GDRIVE_CLIENT_SECRET"],
                                   "refresh_token": os.environ["GDRIVE_REFRESH_TOKEN"],
                                   "grant_type": "refresh_token"}).encode()
    _, d = req("POST", "https://oauth2.googleapis.com/token", data, {"Content-Type": "application/x-www-form-urlencoded"})
    return d["access_token"]


def folder_id(auth):
    q = urllib.parse.quote(f"name = '{FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false")
    _, d = req("GET", f"https://www.googleapis.com/drive/v3/files?q={q}&fields=files(id)", headers=auth)
    if d["files"]:
        return d["files"][0]["id"]
    meta = json.dumps({"name": FOLDER, "mimeType": "application/vnd.google-apps.folder"}).encode()
    _, d = req("POST", "https://www.googleapis.com/drive/v3/files?fields=id", meta, {**auth, "Content-Type": "application/json"})
    return d["id"]


def upload(auth, parent, path):
    size = os.path.getsize(path)
    mime = "video/mp4" if path.endswith(".mp4") else "image/jpeg" if path.endswith(".jpg") else "application/octet-stream"
    meta = json.dumps({"name": os.path.basename(path), "parents": [parent]}).encode()
    resp, _ = req("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink", meta,
                  {**auth, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": mime,
                   "X-Upload-Content-Length": str(size)})
    session = resp.headers["Location"]
    with open(path, "rb") as f:
        _, d = req("PUT", session, f.read(), {"Content-Type": mime, "Content-Length": str(size)})
    print(f"uploaded {path} -> {d.get('webViewLink')}")


def main():
    auth = {"Authorization": f"Bearer {token()}"}
    parent = folder_id(auth)
    for p in sys.argv[1:]:
        upload(auth, parent, p)


if __name__ == "__main__":
    main()
