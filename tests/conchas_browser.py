"""Cidade das Conchas PixelLab map, southern entry and level-8 Helmeppo patrols."""
import copy
import json
import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(tempfile.gettempdir()) / "mare-conchas-pixellab-review"
OUT.mkdir(parents=True, exist_ok=True)
KEY = "mare-partida-save-v1"
URL = os.environ.get("MARE_TEST_URL", "http://127.0.0.1:8123/")
errors = []


def state(page):
    return page.evaluate("__mareDiagnostics()")


def open_page(browser, seed=None, size=(1366, 768)):
    context = browser.new_context(viewport={"width": size[0], "height": size[1]})
    context.route("**/__dev_version", lambda route: route.fulfill(body="stable"))
    context.route("**/api/akuma/catalog", lambda route: route.fulfill(status=404, body="{}"))
    context.add_init_script('Math.random=(()=>{let x=17391;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}})()')
    if seed:
        context.add_init_script(
            "if(!sessionStorage.seeded){localStorage.setItem("
            + json.dumps(KEY)
            + ","
            + json.dumps(json.dumps(seed))
            + ");sessionStorage.seeded='1'}"
        )
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.clock.install(time="2026-10-20T12:00:00Z")
    page.goto(URL)
    page.wait_for_function('typeof __mareDiagnostics==="function"')
    page.wait_for_function(
        "MarePixelMapRenderer.stats().conchas.loaded && "
        "MarePixelMapRenderer.stats().conchas.loadedObjects===105"
    )
    return context, page


def travel(page):
    page.locator("#enterHunt").click()
    page.locator("[data-quick-mode=map]").click()
    page.locator("[data-island=conchas]").click()
    # Travel starts auto-hunt. Freeze animation time until the UI has disabled
    # it, otherwise locator actionability waits move the hero before inspection.
    page.clock.pause_at(page.evaluate("new Date(Date.now() + 1000).toISOString()"))
    page.locator("[data-travel-area=swamp]").dispatch_event("click")
    if state(page)["autoPlay"]:
        page.locator("#autoToggle").dispatch_event("click")
    page.clock.run_for(100)


def walk_sector(page, sector_id):
    if page.locator("#journeyToggle").get_attribute("aria-expanded") == "false":
        page.locator("#journeyToggle").click()
    page.locator("#huntRoute").click()
    current = state(page)
    target = next(point for point in current["landmarks"] if point["id"] == sector_id)
    distance = ((current["hero"]["x"] - target["x"]) ** 2 + (current["hero"]["y"] - target["y"]) ** 2) ** 0.5
    if distance < 120:
        assert current["walkable"]
        page.locator("#closePanel").click()
        return
    page.locator(f"[data-hunt-sector={sector_id}]").click()
    route_start = state(page)
    samples = []
    for tick in range(320):
        page.clock.run_for(250)
        current = state(page)
        if tick % 8 == 0 or not current["path"]:
            samples.append({'tick':tick,'hero':(round(current['hero']['x'],2),round(current['hero']['y'],2)),'path':current['path'][:3],'destination':current['destination']})
        if not current["path"]:
            break
    assert not current["path"] and current["walkable"], current
    distance = ((current["hero"]["x"] - target["x"]) ** 2 + (current["hero"]["y"] - target["y"]) ** 2) ** 0.5
    assert distance < 120, (sector_id, current["hero"], target, {'route_start':route_start['path'][:8], 'samples':samples[-12:]})


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context, page = open_page(browser)
    page.locator("#characterName").fill("Nauta Conchas")
    page.locator("#nextToClass").click()
    page.locator("#createCharacter").click()
    page.clock.run_for(100)
    template = json.loads(page.evaluate("localStorage.getItem(" + json.dumps(KEY) + ")"))
    context.close()

    low = copy.deepcopy(template)
    low["level"] = 7
    context, page = open_page(browser, low)
    page.locator("#enterHunt").click()
    page.locator("[data-quick-mode=map]").click()
    page.locator("[data-island=conchas]").click()
    assert page.locator("[data-travel-area=swamp]").is_disabled()
    context.close()

    high = copy.deepcopy(template)
    high["level"] = 20
    for size in [(1920, 1080), (1366, 768), (1280, 720), (393, 852), (320, 568)]:
        context, page = open_page(browser, high, size)
        travel(page)
        current = state(page)
        assert current["map"] == {"id": "conchas", "width": 4480, "height": 3456}
        # Source cells include the PixelLab origin offset. Check the declared
        # entry and its southern sector, then the actual hero position.
        entry = page.evaluate("""() => ({
            cell: MarePixelWorldMaps.conchas.spawnCell,
            spawn: MareWorld.maps.conchas.spawn,
            south: MarePixelWorldMaps.conchas.districts.find(d => d.id === 'areia-sul')
        })""")
        assert entry["cell"] == [11, 24], entry
        spawn = entry["spawn"]
        assert (spawn["x"], spawn["y"]) == (entry["south"]["x"], entry["south"]["y"]), entry
        assert ((current["hero"]["x"] - spawn["x"]) ** 2 + (current["hero"]["y"] - spawn["y"]) ** 2) ** 0.5 < 24, (current["hero"], entry)
        assert current["walkable"] and current["alive"] > 0
        assert all(mob["type"] == "helmeppo" and mob["level"] == 8 for mob in current["mobs"]), current["mobs"]
        assert current["hunt"]["bossReady"] is False
        assert page.evaluate("MareHunt.get('swamp').boss") is None
        assert page.evaluate("MarePixelWorldMaps.stats().conchas") == {
            "loaded": True, "colliders": page.evaluate("MarePixelWorldMaps.conchas.map.colliders.length"), "objects": 105, "loadedObjects": 105
        }
        assert page.evaluate("MareNewIslandArt.sheets.helmeppo.attack.complete")
        assert page.evaluate("MareNewIslandArt.layout({...__mareDiagnostics().mobs[0],attackAnim:.4}).action") == "attack"
        if size == (1366, 768):
            page.screenshot(path=str(OUT / "cidade-das-conchas.png"))
        if page.locator("#journeyToggle").get_attribute("aria-expanded") == "false":
            page.locator("#journeyToggle").click()
        page.locator("#huntRoute").click()
        assert page.locator("[data-hunt-sector]").count() == 4
        page.locator("#closePanel").click()
        page.locator("#returnLobby").click()
        page.reload()
        page.wait_for_function('typeof __mareDiagnostics==="function"')
        saved = json.loads(page.evaluate("localStorage.getItem(" + json.dumps(KEY) + ")"))
        for key in ["name", "classId", "factionId", "equipment", "inventory", "gold", "materials", "claimed"]:
            assert saved[key] == high[key], key
        assert saved["area"] == "swamp" and saved["level"] == 20
        context.close()
        print("Conchas PixelLab load, south spawn, Helmeppo and save compatibility", size, "passed", flush=True)

    context, page = open_page(browser, high)
    travel(page)
    if page.locator("#journeyToggle").get_attribute("aria-expanded") == "false":
        page.locator("#journeyToggle").click()
    page.locator("#huntRoute").click()
    page.locator("#closePanel").click()
    for sector in ["areia-sul", "caminho-central", "ruas-do-porto", "praca-das-conchas"]:
        walk_sector(page, sector)
    assert not any(mob["type"] == "boss" for mob in state(page)["mobs"])
    assert not errors, errors
    context.close()
    browser.close()
    print("Reachable level-8 Helmeppo sectors, no boss and no browser errors passed", flush=True)
