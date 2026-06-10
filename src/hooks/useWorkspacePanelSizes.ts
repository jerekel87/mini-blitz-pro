import { useEffect, useState } from 'react';

export interface WorkspacePanelSizes {
  /** Explorer column (% of horizontal group) */
  sidebar: number;
  center: number;
  preview: number;
  /** Editor within center column (%) */
  editor: number;
  dock: number;
}

/** Defaults tuned for common IDE viewports (1280–1920px wide). */
export function getWorkspacePanelSizes(viewportWidth: number): WorkspacePanelSizes {
  if (viewportWidth >= 1920) {
    return { sidebar: 16, center: 42, preview: 42, editor: 58, dock: 42 };
  }
  if (viewportWidth >= 1600) {
    return { sidebar: 17, center: 43, preview: 40, editor: 60, dock: 40 };
  }
  if (viewportWidth >= 1440) {
    return { sidebar: 18, center: 44, preview: 38, editor: 62, dock: 38 };
  }
  if (viewportWidth >= 1280) {
    return { sidebar: 19, center: 45, preview: 36, editor: 63, dock: 37 };
  }
  if (viewportWidth >= 1024) {
    return { sidebar: 21, center: 46, preview: 33, editor: 65, dock: 35 };
  }
  return { sidebar: 24, center: 48, preview: 28, editor: 68, dock: 32 };
}

export function useWorkspacePanelSizes(): WorkspacePanelSizes {
  const [sizes, setSizes] = useState(() =>
    typeof window !== 'undefined'
      ? getWorkspacePanelSizes(window.innerWidth)
      : getWorkspacePanelSizes(1440)
  );

  useEffect(() => {
    const update = () => setSizes(getWorkspacePanelSizes(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return sizes;
}