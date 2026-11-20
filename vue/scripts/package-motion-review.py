import hashlib
import json
import math
import re
import struct
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / ".artifacts"
REVIEW = ARTIFACTS / "motion-review"
SCRIPTS = ROOT / "scripts"
SIDES = ("react", "vue", "diff")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(report, catalog):
    expected = {
        (entry["slug"], variant["slug"], theme)
        for entry in catalog["entries"]
        for variant in (entry["examples"] or [entry])
        for theme in ["light", "dark"]
    }
    groups = report["results"]
    actual = {(item["slug"], item["variant"], item["theme"]) for item in groups}
    require(report["baseline"] == catalog["baseline"], "Catalog baseline mismatch")
    require(actual == expected and len(actual) == len(groups), "Missing or duplicate groups")
    require(report["humanReview"] == "pending", "Capture report has unexpected review state")
    checkpoints = [("start", 0), ("mid", 120), ("end", 900)]
    width = report["dimensions"]["width"]
    height = report["dimensions"]["height"]
    names = []
    for item in groups:
        prefix = "--".join([item["slug"], item["variant"], item["theme"]])
        require(item["status"] == "captured" and not item["errors"], f"Incomplete capture: {prefix}")
        require(item["review"] == "pending" and item["input"]["inputEquivalence"], f"Incomplete metadata: {prefix}")
        require([(frame["name"], frame["at"]) for frame in item["frames"]] == checkpoints, f"Missing frame: {prefix}")
        for frame in item["frames"]:
            pixels = frame["changedPixels"]
            require(0 <= pixels <= width * height and math.isclose(frame["ratio"], pixels / (width * height)), f"Invalid diff: {prefix}")
            for side in SIDES:
                name = frame[side]
                require(name == f"{prefix}--{frame['name']}--{side}.png" and re.fullmatch(r"[a-z0-9-]+\.png", name), f"Unexpected filename: {name}")
                with (REVIEW / name).open("rb") as image:
                    header = image.read(24)
                require(header[:16] == b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" and struct.unpack(">II", header[16:24]) == (width, height), f"Bad PNG: {name}")
                names.append(name)
    require(len(set(names)) == len(expected) * len(checkpoints) * len(SIDES), "Duplicated frame filenames")
    return sorted(names)


def build():
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
    report = json.loads((REVIEW / "report.json").read_text(encoding="utf-8"))
    names = validate(report, catalog)
    data = json.dumps(report, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")
    template = (SCRIPTS / "motion-review-index.html").read_text(encoding="utf-8")
    require(template.count("__MOTION_REPORT__") == 1, "Invalid HTML template")
    html = template.replace("__MOTION_REPORT__", data).encode()
    (REVIEW / "index.html").write_bytes(html)
    members = ["index.html", "report.json", *names]
    archive_path = ARTIFACTS / "motion-review.zip"
    with tempfile.TemporaryDirectory(dir=ARTIFACTS) as staging:
        staging_path = Path(staging) / archive_path.name
        with zipfile.ZipFile(staging_path, "w") as archive:
            for name in members:
                entry = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_STORED if name.endswith(".png") else zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, (REVIEW / name).read_bytes())
        with zipfile.ZipFile(staging_path) as archive:
            require(archive.namelist() == members and archive.testzip() is None, "Archive failed membership or CRC check")
        staging_path.replace(archive_path)
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    print(f"{len(report['results'])} capture groups, {len(names)} PNG, {len(members)} archive files")
    print(f"{archive_path} ({archive_path.stat().st_size:,} bytes), SHA-256 {digest}")


if __name__ == "__main__":
    build()
