import test from "node:test";
import assert from "node:assert/strict";
import { getAnnouncementImages } from "../utils/shared/announcementImages.js";

test("announcement images include legacy and multiple uploaded images without duplicates", () => {
  assert.deepEqual(
    getAnnouncementImages('["first.png","second.jpg"]', "first.png"),
    ["first.png", "second.jpg"],
  );
});

test("announcement image parsing ignores malformed and unsafe filenames", () => {
  assert.deepEqual(
    getAnnouncementImages('["safe.png","../outside.png","C:\\\\outside.png"]'),
    ["safe.png"],
  );
});
