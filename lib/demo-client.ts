export function demoVisitorId() {
  let id = localStorage.getItem("bustem-gtm-visitor");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("bustem-gtm-visitor", id);
  }
  return id;
}

export function demoSource() {
  const querySource = new URLSearchParams(location.search).get("utm_source");
  if (querySource) sessionStorage.setItem("bustem-gtm-source", querySource);
  return querySource || sessionStorage.getItem("bustem-gtm-source") || document.referrer || "direct";
}

export async function demoEvent(kind: string, page: string) {
  const visitorId = demoVisitorId();
  const source = demoSource();
  await fetch("/api/gtm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "event", visitorId, kind, page, source }),
    keepalive: true,
  });
}
