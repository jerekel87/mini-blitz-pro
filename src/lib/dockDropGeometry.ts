import type { DockZoneId } from './workspaceLayout';

const DOCK_ZONE_ORDER: DockZoneId[] = [
  'sidebar-below',
  'editor-above',
  'bottom',
  'preview-above',
  'preview-below',
];

export interface MeasuredDockZone {
  zone: DockZoneId;
  top: number;
  left: number;
  width: number;
  height: number;
}

const ZONE_SLICE: Record<DockZoneId, number> = {
  'sidebar-below': 0.32,
  'editor-above': 0.26,
  bottom: 0.28,
  'preview-above': 0.26,
  'preview-below': 0.28,
};

function panelBox(id: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(`[data-panel-id="${id}"]`);
  if (!el || el.offsetParent === null) return null;
  const box = el.getBoundingClientRect();
  if (box.width < 24 || box.height < 24) return null;
  return box;
}

function fromMountedDock(zone: DockZoneId): MeasuredDockZone | null {
  const el = document.querySelector<HTMLElement>(`[data-dock-zone="${zone}"]`);
  if (!el || el.offsetParent === null) return null;
  const box = el.getBoundingClientRect();
  if (box.width < 8 || box.height < 8) return null;
  return {
    zone,
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  };
}

function sliceRect(
  box: DOMRect,
  edge: 'top' | 'bottom',
  fraction: number
): MeasuredDockZone {
  const height = Math.max(48, Math.min(box.height * fraction, box.height - 24));
  const top = edge === 'top' ? box.top : box.bottom - height;
  return {
    zone: 'bottom',
    top,
    left: box.left,
    width: box.width,
    height,
  };
}

function fallbackZoneRect(zone: DockZoneId): MeasuredDockZone | null {
  const frac = ZONE_SLICE[zone];

  switch (zone) {
    case 'sidebar-below': {
      const sidebar = panelBox('sidebar');
      if (!sidebar) return null;
      const slice = sliceRect(sidebar, 'bottom', frac);
      return { ...slice, zone };
    }
    case 'editor-above': {
      const center = panelBox('center');
      if (!center) return null;
      const slice = sliceRect(center, 'top', frac);
      return { ...slice, zone };
    }
    case 'bottom': {
      const center = panelBox('center');
      if (!center) return null;
      const slice = sliceRect(center, 'bottom', frac);
      return { ...slice, zone };
    }
    case 'preview-above': {
      const preview = panelBox('preview');
      if (!preview) return null;
      const slice = sliceRect(preview, 'top', frac);
      return { ...slice, zone };
    }
    case 'preview-below': {
      const preview = panelBox('preview');
      if (!preview) return null;
      const slice = sliceRect(preview, 'bottom', frac);
      return { ...slice, zone };
    }
    default:
      return null;
  }
}

/** All dock drop targets — mounted docks or inferred regions from the workspace layout. */
export function measureDockZones(): MeasuredDockZone[] {
  const out: MeasuredDockZone[] = [];

  for (const zone of DOCK_ZONE_ORDER) {
    const mounted = fromMountedDock(zone);
    if (mounted) {
      out.push(mounted);
      continue;
    }
    const fallback = fallbackZoneRect(zone);
    if (fallback) out.push(fallback);
  }

  return out;
}

export function hitMeasuredDockZone(
  clientX: number,
  clientY: number,
  pad = 32
): {
  zone: DockZoneId | null;
  inside: boolean;
  proximity: number;
} {
  const zones = measureDockZones();
  const insideHits: { zone: DockZoneId; area: number }[] = [];
  const nearHits: { zone: DockZoneId; dist: number }[] = [];

  for (const z of zones) {
    const box = z;
    const pointInside =
      clientX >= box.left - pad &&
      clientX <= box.left + box.width + pad &&
      clientY >= box.top - pad &&
      clientY <= box.top + box.height + pad;

    if (pointInside) {
      insideHits.push({ zone: z.zone, area: box.width * box.height });
      continue;
    }

    const right = box.left + box.width;
    const bottom = box.top + box.height;
    const cx = Math.max(box.left, Math.min(clientX, right));
    const cy = Math.max(box.top, Math.min(clientY, bottom));
    nearHits.push({ zone: z.zone, dist: Math.hypot(clientX - cx, clientY - cy) });
  }

  if (insideHits.length > 0) {
    const best = insideHits.reduce((a, b) => (a.area < b.area ? a : b));
    return { zone: best.zone, inside: true, proximity: 1 };
  }

  if (nearHits.length > 0) {
    const best = nearHits.reduce((a, b) => (a.dist < b.dist ? a : b));
    const proximity = Math.max(0, 1 - best.dist / (pad * 3));
    return { zone: best.zone, inside: false, proximity };
  }

  return { zone: null, inside: false, proximity: 0 };
}