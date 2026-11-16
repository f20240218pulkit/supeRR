import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/results.js";
const code = "test-only-30-character-code-xyz";
const fixture = {schema:1,kind:"submission",batting:[{name:"Fictional batter"}],bowling:[{name:"Fictional bowler"}]};

function invoke(method, authorization) {
  const outcome = {headers:{}};
  const res = {
    setHeader(key,value) { outcome.headers[key]=value; },
    status(code) { outcome.status=code; return this; },
    json(body) { outcome.body=body; return this; }
  };
  handler({method,headers:{authorization}},res);
  return outcome;
}

test("judge results fail closed, require POST and a valid code, and never cache",()=>{
  delete process.env.RR_ACCESS_CODE;
  delete process.env.RR_RESULTS_JSON;
  assert.equal(invoke("POST").status,503);
  process.env.RR_ACCESS_CODE = code;
  process.env.RR_RESULTS_JSON = JSON.stringify(fixture);
  assert.equal(invoke("GET",`Bearer ${code}`).status,405);
  for (const auth of [undefined,"Bearer incorrect"]) {
    const response=invoke("POST",auth);
    assert.equal(response.status,401);
    assert.equal(response.body.batting,undefined);
  }
  const response=invoke("POST",`Bearer ${code}`);
  assert.equal(response.status,200);
  assert.equal(response.headers["Cache-Control"],"private, no-store");
  assert.deepEqual(response.body,fixture);
  process.env.RR_RESULTS_JSON="{";
  assert.equal(invoke("POST",`Bearer ${code}`).status,503);
});
