// /* global google */
// src/components/forMypage/MyPlacesMap.jsx
// - 先頭アイテムの位置を初期中心に（zoom=12）。無ければ東京駅（zoom=5）
// - 読み込み後に geolocation を一度だけ自動試行（右上に「現在地を使う」ボタンも装備）
// - ピンの InfoWindow に「詳細 / 編集 / 削除」ボタンを表示（削除は確認ダイアログ後 onDelete を呼ぶ）

import { useEffect, useRef } from "react";
import { ensureMaps } from "../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

// geolocation 1回（Promiseラップ）
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

export default function MyPlacesMap({
  items = [],
  greedyScroll = false,
  onEdit, // (id:number) => void
  onDelete, // (id:number) => Promise<void> | void
}) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let map, meMarker, btnDiv, spinnerDiv, toastDiv;
    let info; // 共有 InfoWindow
    let advanced = false;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;
      const canImport = typeof g.maps.importLibrary === "function";

      // 初期中心：先頭の座標があればそこ、無ければ東京駅
      const first = items.find(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
      const defaultCenter = first
        ? { lat: +first.latitude, lng: +first.longitude }
        : { lat: 35.681236, lng: 139.767125 };

      const mapOpts = {
        center: defaultCenter,
        zoom: first ? 12 : 5,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        gestureHandling: greedyScroll ? "greedy" : "auto",
        mapTypeControl: true,
        fullscreenControl: true,
      };

      if (canImport) {
        const { Map } = await g.maps.importLibrary("maps");
        map = new Map(ref.current, mapOpts);
        advanced = true;
      } else {
        map = new g.maps.Map(ref.current, mapOpts);
      }

      info = new g.maps.InfoWindow();

      // マーカー
      const valid = items.filter(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );

      const openInfo = (place, anchor) => {
        if (!info) return;

        // InfoWindow の中身（編集/削除ボタンあり）
        info.setContent(buildInfoHtml(place));

        // ボタンクリックを紐付け（domready で要素が生成された後に）
        g.maps.event.addListenerOnce(info, "domready", () => {
          const root = document.getElementById(`infocontent-${place.id}`);
          if (!root) return;

          const editBtn = root.querySelector("[data-action='edit']");
          const delBtn = root.querySelector("[data-action='delete']");

          if (editBtn) {
            editBtn.addEventListener("click", (e) => {
              e.preventDefault();
              onEdit?.(place.id);
            });
          }

          if (delBtn) {
            delBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              const ok = window.confirm(
                `「${
                  place.name || "この場所"
                }」を削除しますか？`
              );
              if (!ok) return;
              try {
                await onDelete?.(place.id);
                info.close();
              } catch (err) {
                alert(`削除に失敗しました: ${err?.message || err}`);
              }
            });
          }
        });

        // AdvancedMarker と旧 Marker の open 指定が異なる
        if (anchor && typeof anchor.addListener === "function") {
          info.open({ map, anchor }); // AdvancedMarkerElement
        } else {
          info.open(map, anchor); // google.maps.Marker
        }
      };

      if (advanced) {
        const { AdvancedMarkerElement, PinElement } =
          await g.maps.importLibrary("marker");
        for (const p of valid) {
          const position = { lat: +p.latitude, lng: +p.longitude };
          const pin = new PinElement({
            glyphText: (p.name || "").slice(0, 2).toUpperCase(),
          });
          const marker = new AdvancedMarkerElement({
            map,
            position,
            content: pin.element,
            title: p.name || "",
          });
          marker.addListener("gmp-click", () => openInfo(p, marker));
        }
      } else {
        for (const p of valid) {
          const position = { lat: +p.latitude, lng: +p.longitude };
          const marker = new g.maps.Marker({
            map,
            position,
            title: p.name || "",
          });
          marker.addListener("click", () => openInfo(p, marker));
        }
      }

      // 右上：現在地ボタン
      btnDiv = document.createElement("div");
      Object.assign(btnDiv.style, {
        background: "#fff",
        borderRadius: "8px",
        padding: "8px 12px",
        margin: "10px",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        fontSize: "13px",
        userSelect: "none",
        pointerEvents: "auto",
      });
      btnDiv.tabIndex = 0;
      btnDiv.textContent = "現在地を使う";
      map.controls[g.maps.ControlPosition.TOP_RIGHT].push(btnDiv);

      // 右上：取得中インジケータ
      spinnerDiv = document.createElement("div");
      spinnerDiv.style.cssText =
        "display:none;background:rgba(255,255,255,0.95);padding:8px 10px;margin:10px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:12px;";
      spinnerDiv.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:3px solid #cbd5e1;border-top-color:#334155;border-radius:50%;margin-right:6px;vertical-align:-2px;animation:spin 1s linear infinite"></span>位置情報を取得中…`;
      map.controls[g.maps.ControlPosition.TOP_RIGHT].push(spinnerDiv);

      // 下右：トースト（失敗時）
      toastDiv = document.createElement("div");
      Object.assign(toastDiv.style, {
        position: "absolute",
        right: "10px",
        bottom: "10px",
        background: "rgba(220,38,38,0.95)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        zIndex: "9999",
        display: "none",
      });
      ref.current.appendChild(toastDiv);
      const showToast = (msg, ms = 2200) => {
        toastDiv.textContent = msg;
        toastDiv.style.display = "block";
        setTimeout(() => (toastDiv.style.display = "none"), ms);
      };

      const setBusy = (busy) => {
        if (!btnDiv || !spinnerDiv) return;
        btnDiv.textContent = busy ? "取得中…" : "現在地を使う";
        btnDiv.style.opacity = busy ? "0.7" : "1";
        btnDiv.style.pointerEvents = busy ? "none" : "auto";
        spinnerDiv.style.display = busy ? "block" : "none";
      };

      const showMe = (lat, lng) => {
        const pos = { lat, lng };
        if (meMarker) {
          if (advanced) meMarker.position = pos;
          else meMarker.setPosition(pos);
        } else {
          if (advanced) {
            (async () => {
              const { AdvancedMarkerElement } = await g.maps.importLibrary(
                "marker"
              );
              const el = document.createElement("div");
              el.style.width = "12px";
              el.style.height = "12px";
              el.style.borderRadius = "50%";
              el.style.background = "#1a73e8";
              el.style.boxShadow = "0 0 0 6px rgba(26,115,232,0.25)";
              meMarker = new AdvancedMarkerElement({
                map,
                position: pos,
                content: el,
                title: "現在地",
              });
            })();
          } else {
            meMarker = new g.maps.Marker({
              map,
              position: pos,
              title: "現在地",
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#1a73e8",
                fillOpacity: 1,
                strokeWeight: 8,
                strokeOpacity: 0.25,
                strokeColor: "#1a73e8",
              },
            });
          }
        }
        map.panTo(pos);
        map.setZoom(Math.max(map.getZoom(), 14));
      };

      // 位置取得 共通ロジック
      async function acquire() {
        const tryGet = (opts) =>
          getCurrentPositionOnce(opts).then(
            (pos) => ({ ok: true, pos }),
            (err) => ({ ok: false, err })
          );

        try {
          setBusy(true);

          const tries = [
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
          ];

          let got = null;
          for (const t of tries) {
            const r = await tryGet(t);
            if (r.ok) {
              got = r.pos;
              break;
            }
          }

          if (!got) {
            if (first) {
              map.setCenter(defaultCenter);
              map.setZoom(12);
            }
            showToast("現在地取得に失敗しました。先頭の場所を表示します。");
            return;
          }

          const { latitude, longitude } = got.coords;
          showMe(latitude, longitude);
        } finally {
          setBusy(false);
        }
      }

      // ボタンの挙動
      btnDiv.onclick = () => acquire();
      btnDiv.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          acquire();
        }
      };

      // 初回自動試行
      acquire();
    })();

    return () => {
      cancelled = true;
    };
  }, [items, greedyScroll, onEdit, onDelete]);

  return (
    <div
      ref={ref}
      className="w-full rounded-xl border"
      style={{ height: "420px", position: "relative" }}
    />
  );
}

/* ================= Utilities ================= */

function buildMapsUrl(p) {
  if (p.google_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
      p.google_place_id
    )}`;
  }
  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";
  const name = p.name || "";
  const q = [name, addr].filter(Boolean).join(" ");
  if (q.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      q
    )}`;
  }
  if (p.latitude != null && p.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${p.latitude},${p.longitude}`
    )}`;
  }
  return "https://www.google.com/maps";
}

function buildInfoHtml(p) {
  const thumb = p.first_photo_url
    ? `<img src="${escapeHtml(p.first_photo_url)}" alt="${escapeHtml(
        p.name || ""
      )}" style="width:72px;height:72px;border-radius:10px;object-fit:cover;flex:none;display:block;" />`
    : `<div style="width:72px;height:72px;border-radius:10px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px;flex:none;">No image</div>`;

  const name = p.name
    ? `<div style="font-weight:700;font-size:14px;line-height:1.3;">${escapeHtml(
        p.name
      )}</div>`
    : "";

  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";
  const addrHtml = addr
    ? `<div style="font-size:12px;color:#374151;margin-top:2px;">${escapeHtml(
        addr
      )}</div>`
    : "";

  const desc = (p.description || "").trim();
  const descShort = desc.length > 60 ? `${desc.slice(0, 60)}…` : desc;
  const descHtml = descShort
    ? `<div style="font-size:12px;color:#111827;margin-top:6px;">${escapeHtml(
        descShort
      )}</div>`
    : "";

  const mapsUrl = buildMapsUrl(p);

  // data-action でハンドラを紐付けする
  return `
  <div id="infocontent-${p.id}" style="width:260px;padding:12px 12px 10px;border-radius:14px;">
    <div style="display:flex;gap:10px;">
      ${thumb}
      <div style="min-width:0;flex:1 1 auto;">
        ${name}
        ${addrHtml}
        ${descHtml}
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:10px;">
      <a href="/places/${p.id}" style="text-decoration:none;background:#111827;color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;">詳細</a>
      <a href="${mapsUrl}" target="_blank" rel="noopener" style="text-decoration:none;background:#e5e7eb;color:#111827;padding:8px 10px;border-radius:10px;font-size:12px;">Googleマップ</a>
      <a href="#" data-action="edit"  style="text-decoration:none;background:#0ea5e9;color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;">編集</a>
      <a href="#" data-action="delete" style="text-decoration:none;background:#fca5a5;color:#7f1d1d;padding:8px 10px;border-radius:10px;font-size:12px;">削除</a>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
