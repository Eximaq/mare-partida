"""Materialize the exact 18 C151 North layers from an archived #348 checkpoint."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

CHECKPOINT_SHA = "cdd9889e5d96f92f826536779298fa86b9af0e0b52f2af2af41ac382a0087377"
LAYER_IDS = {
    "coat151-whole-torso", "coat151-whole-hem", "coat151-whole-leftUpper", "coat151-whole-rightUpper",
}

def digest(value):
    return hashlib.sha256(value).hexdigest()

def png(data, expected):
    if not data.startswith(b"\x89PNG\r\n\x1a\n") or digest(data) != expected:
        raise ValueError(f"Source mismatch {expected}")
    return data

def materialize(checkpoint, masks, out):
    if digest(checkpoint.read_bytes()) != CHECKPOINT_SHA:
        raise ValueError("Unexpected W113 archive revision")
    assets = out / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(checkpoint) as bundle:
        cat = json.loads(bundle.read("fuzil113-ns/catalog.json"))
        source = cat["originals"]["north"]
        if source["item"] != 113 or source["sourceBaseId"] != "v7-female-firearm-north-ownership-candidate-north":
            raise ValueError("Unexpected W113 body")
        parts = {l["id"]: l for l in source["pack"]["directions"]["north"]["layers"] if l["id"] in LAYER_IDS}
        if set(parts) != LAYER_IDS or any(len(l["frames"]) != 8 for l in parts.values()):
            raise ValueError("Missing C151 garment frames")
        refs = {v for l in parts.values() for v in l["frames"]}
        if len(refs) != 18:
            raise ValueError("Unexpected number of coat PNGs")
        naked = {h for l in source["pack"]["directions"]["north"]["layers"][:11] for h in l["frames"]}
        gloves = [row for row in cat["northGloves"] if row["item"] == 26]
        if len(gloves) != 16 or {(row["side"], row["phase"]) for row in gloves} != {(side, i) for side in ("left", "right") for i in range(8)}:
            raise ValueError("Missing W113 G26 phase-owned glove assets")
        glove_refs = {row["sha"] for row in gloves} - naked
        if len(glove_refs) != 4:
            raise ValueError("Wrong W113 G26 phase-owned glove assets")
        g166_ids = {"candidate-glove166-left", "candidate-glove166-right"}
        g166 = [l for l in source["pack"]["directions"]["north"]["layers"] if l["id"] in g166_ids]
        g166_refs = {v for l in g166 for v in l["frames"]}
        if {l["id"] for l in g166} != g166_ids or any(len(l["frames"]) != 8 for l in g166) or len(g166_refs) != 5:
            raise ValueError("Wrong W113 G166 phase-owned glove assets")
        glove_refs.update(g166_refs)
        g159 = [row for row in cat["northGloves"] if row["item"] == 159]
        if len(g159) != 16 or {(row["side"], row["phase"]) for row in g159} != {(side, i) for side in ("left", "right") for i in range(8)}:
            raise ValueError("Missing W113 G159 phase-owned glove assets")
        if any(row["sha"] not in naked for row in g159 if row["phase"] not in (0, 7)):
            raise ValueError("Unexpected intermediate W113 G159 material")
        g159_refs = {row["sha"] for row in g159 if row["phase"] in (0, 7)}
        if len(g159_refs) != 4 or g159_refs & naked:
            raise ValueError("Wrong W113 G159 phase-owned glove assets")
        glove_refs.update(g159_refs)
        for item in (131, 138, 145, 152, 173, 180):
            additional = [row for row in cat["northGloves"] if row["item"] == item]
            if len(additional) != 16 or {(row["side"], row["phase"]) for row in additional} != {(side, i) for side in ("left", "right") for i in range(8)}:
                raise ValueError("Missing W113 supplemental glove phase-owned glove assets")
            if any(row["sha"] not in naked for row in additional if row["phase"] not in (0, 7)):
                raise ValueError("Unexpected intermediate W113 supplemental glove material")
            additional_refs = {row["sha"] for row in additional if row["phase"] in (0, 7)}
            if len(additional_refs) != 4 or additional_refs & naked:
                raise ValueError("Wrong W113 supplemental glove phase-owned glove assets")
            glove_refs.update(additional_refs)
        p154 = next(l for l in source["pack"]["directions"]["north"]["layers"] if l["id"] == "candidate-pants154")
        p154_variants = [v["frames"] for v in cat["northVariants"] if v["slot"] == "pants" and v["item"] == 154]
        pants_refs = set(p154["frames"])
        if p154_variants != [p154["frames"]] or len(pants_refs) != 8 or pants_refs & (refs | naked | glove_refs) or p154.get("slot") != "pants" or p154["depth"] != 3.1 or p154["binding"] != {"kind": "fixed"}:
            raise ValueError("Wrong W113 P154 phase-owned cloth")
        for h in sorted(refs | glove_refs | pants_refs):
            (assets / f"{h}.png").write_bytes(png(bundle.read(f"fuzil113-ns/assets/{h}.png"), h))
    mapping = json.loads((masks / "skin-masks.json").read_text())
    body = next(l for l in source["pack"]["directions"]["north"]["layers"] if l["id"] == "body-clothed")
    if set(mapping) != set(body["frames"]) or len(set(mapping.values())) != 8:
        raise ValueError("Wrong phase-owned skin masks")
    for h in sorted(mapping.values()):
        (assets / f"{h}.png").write_bytes(png((masks / f"{h}.png").read_bytes(), h))
    return len(refs), len(mapping)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("masks", type=Path)
    parser.add_argument("out", type=Path)
    opt = parser.parse_args()
    print("W113/C151 coat PNGs and North skin masks:", materialize(opt.checkpoint, opt.masks, opt.out))
