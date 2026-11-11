import test from "node:test";
import assert from "node:assert/strict";
import { canAdvancePersonalDetails } from "./app.js";

test("blocks next when a required personal detail is empty", () => {
  assert.equal(
    canAdvancePersonalDetails({
      firstName: "Reinis",
      lastName: "",
      age: "38",
      gender: "Male",
      height: "188",
      weight: "108",
      country: "Latvia",
    }),
    false
  );
});

test("allows next when required personal details are filled", () => {
  assert.equal(
    canAdvancePersonalDetails({
      firstName: "Reinis",
      lastName: "Paulins",
      age: "38",
      gender: "Male",
      height: "188",
      weight: "108",
      country: "Latvia",
    }),
    true
  );
});
