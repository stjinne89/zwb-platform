import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Hermetic component harness: production component, fixture responses, no live account or database.
let javascript = "", stylesheet = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: 'import React from "react"; import {createRoot} from "react-dom/client"; import {SegmentExplorer} from "./src/app/(app)/profiel/segments/_components/segment-explorer"; createRoot(document.getElementById("root")).render(<SegmentExplorer/>);', resolveDir: process.cwd(), loader:"tsx" },
    bundle:true, write:false, outfile:"segment-ui.js", platform:"browser", format:"iife", jsx:"automatic", loader:{".png":"dataurl"},
    define:{ "process.env.NODE_ENV": '"production"' },
  });
  javascript = result.outputFiles.find((f) => f.path.endsWith(".js"))!.text;
  const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css","utf8"), { from:path.resolve("src/app/globals.css") });
  stylesheet = css.css + "\n" + (result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "");
});

const item = { id:"12345",name:"ZWB testklim",distance:2500,grade:4,start:[52,5],line:[[52,5],[52.02,5.01]],riders:4,mine:400,rank:3,record:350,updatedAt:"2026-09-13T12:00:00Z",assessment:{ status:"likely",reason:null,targetSeconds:349,fastSeconds:300,slowSeconds:330 } };
const detail = { ...item,hazardous:false,leaderboard:[{profileId:"a",name:"Renner A",seconds:350,rank:1},{profileId:"b",name:"Renner B",seconds:375,rank:2},{profileId:"c",name:"Renner C",seconds:400,rank:3}] };
test.beforeEach(async ({ page }) => {
  await page.route("https://segment.test/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/") return route.fulfill({ contentType:"text/html",body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="root" style="padding:24px;max-width:1400px;margin:auto"></main></body></html>' });
    if (url.pathname === "/api/segments/explore/12345") return route.fulfill({ json:detail });
    if (url.pathname === "/api/segments/explore") {
      const queried = url.searchParams.get("q");
      return route.fulfill({ json:{ items:queried && queried !== "ZWB" ? [] : [item],clusters:[],nextOffset:null } });
    }
    return route.fulfill({ status:404 });
  });
  await page.route("https://*.basemaps.cartocdn.com/**", (route) => route.fulfill({ status:204 }));
  await page.goto("https://segment.test/");
  await page.addStyleTag({ content:stylesheet });
  await page.addScriptTag({ content:javascript });
});

test("kaart en lijst delen selectie, doeltijd en Strava-link", async ({ page }) => {
  await expect(page.getByRole("button",{name:/ZWB testklim/})).toBeVisible();
  await page.getByRole("button",{name:/ZWB testklim/}).click();
  const details = page.getByRole("region",{name:"Segmentdetails"});
  await expect(details.getByRole("link",{name:"ZWB testklim"})).toHaveAttribute("href","https://www.strava.com/segments/12345");
  await expect(details.getByRole("link",{name:"ZWB testklim"})).toHaveAttribute("target","_blank");
  await expect(details.getByRole("table")).toContainText("Renner A");
  await expect(details).toContainText("5:00 – 5:30");
  await page.screenshot({path:"test-results/segments-desktop.png",fullPage:true});
  await page.getByRole("button",{name:"ZWB-podium",exact:true}).click();
  await expect(page.getByRole("button",{name:"ZWB-podium",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("textbox",{name:"Zoek segment"}).fill("Onbekend");
  await expect(page.getByText("Geen segmenten in deze selectie.")).toBeVisible();
});

test("mobiel wisselt tussen kaart en lijst zonder horizontale overflow", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Lijst",exact:true}).click();
  await expect(page.getByRole("button",{name:/ZWB testklim/})).toBeVisible();
  await page.getByRole("button",{name:"Kaart",exact:true}).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.getByRole("button",{name:"ZWB-record",exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/segments-mobile.png",fullPage:true});
});
