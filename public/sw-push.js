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
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
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
