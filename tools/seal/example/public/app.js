async function getJson(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  try {
    return { ok: r.ok, status: r.status, json: JSON.parse(text) };
  } catch {
    return { ok: r.ok, status: r.status, json: { raw: text } };
  }
}

function pretty(o) {
  return JSON.stringify(o, null, 2);
}

async function refreshStatus() {
  const el = document.querySelector("#status");
  el.textContent = "loading...";
  const res = await getJson("/api/status");
  el.textContent = pretty(res.json);
}

async function doMd5() {
  const text = document.querySelector("#md5Input").value || "";
  const out = document.querySelector("#md5Out");
  out.textContent = "…";
  const res = await getJson("/api/md5", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  out.textContent = pretty(res.json);
}

async function externalCall() {
  const out = document.querySelector("#externalOut");
  out.textContent = "…";
  const res = await getJson("/api/external/ping");
  out.textContent = pretty(res.json);
}

document.querySelector("#btnRefresh").addEventListener("click", refreshStatus);
document.querySelector("#btnMd5").addEventListener("click", doMd5);
document.querySelector("#btnExternal").addEventListener("click", externalCall);

refreshStatus();
