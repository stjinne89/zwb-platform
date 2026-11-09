/* ZWB push service worker.
 *
 * Apart van eventuele PWA-SW (next-pwa) zodat updates aan offline-
 * caching deze handler niet breken. Alleen verantwoordelijk voor
 * `push` + `notificationclick` events.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ZWB", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "ZWB Cycling";
  const options = {
    body: payload.body || "",
    // Sinds 0322 stuurt de server icoon en badge van de club mee; null is
    // "geen" (een club zonder beeldmerk). Zonder sleutel (een oudere server)
    // de vaste ZWB-bestanden, zoals eerder.
    icon: "icon" in payload ? payload.icon || undefined : "/icon-192.png",
    // Android tekent de badge als alfamasker op ~24px: elke dekkende pixel
    // wordt wit. Met icon-192.png (een vol vierkant) leverde dat een massief
    // wit blok op. badge-96.png is transparant met alleen het merksilhouet.
    badge: "badge" in payload ? payload.badge || undefined : "/badge-96.png",
    image: payload.image || undefined,
    actions: Array.isArray(payload.actions) ? payload.actions : undefined,
    tag: payload.tag || undefined,
    data: { url: payload.url || "/", ...payload.data },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          // Bestaande tab focussen als die de juiste route heeft
          if (
            client.url.endsWith(url) ||
            client.url.includes(url)
          ) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      },
    ),
  );
});
