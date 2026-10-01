import assert from "assert";
import { matchesPass, tierPassFilter, passesForId, setPassIndex, passBadgeLabel } from "./pass-filter.js";

assert.equal(matchesPass(["epic"], "all"), true);
assert.equal(matchesPass(["epic"], "epic"), true);
assert.equal(matchesPass(["epic", "ikon"], "ikon"), true);
assert.equal(matchesPass(["epic"], "ikon"), false);
assert.equal(matchesPass([], "independent"), true);
assert.equal(matchesPass(["indy"], "independent"), false);
assert.equal(matchesPass(undefined, "independent"), true);
assert.equal(matchesPass(["mountain_collective"], "mountain_collective"), true);

const epic = tierPassFilter("large", "epic");
assert.equal(epic[0], "all");
assert.deepEqual(epic[2], ["in", "epic", ["get", "_pass"]]);
assert.deepEqual(tierPassFilter("small", "all"), ["==", ["get", "_tier"], "small"]);
assert.deepEqual(tierPassFilter("medium", "independent")[2], ["==", ["get", "_pass"], ""]);

setPassIndex({ "45096232": { passes: ["indy"] } });
assert.deepEqual(passesForId("45096232"), ["indy"]);
assert.deepEqual(passesForId("missing"), []);
assert.equal(passBadgeLabel("mountain_collective"), "MC");
assert.equal(passBadgeLabel("epic"), "EP");

console.log("pass-filter.check ok");
