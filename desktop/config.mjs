export const DESKTOP_PROTOCOL_TOKEN = "__AGENTPROOF_OFFICIAL_DEMO__";

export function browserWindowOptions({ preload, show = true } = {}) {
  return {
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 680,
    show,
    title: "AgentProof",
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      enableRemoteModule: false
    }
  };
}

export function isAllowedNavigation(targetUrl, appOrigin) {
  try {
    const target = new URL(targetUrl);
    return target.origin === appOrigin || target.protocol === "about:" || target.protocol === "blob:";
  } catch {
    return false;
  }
}

export function isExternalHttpUrl(targetUrl, appOrigin) {
  try {
    const target = new URL(targetUrl);
    return /^https?:$/.test(target.protocol) && target.origin !== appOrigin;
  } catch {
    return false;
  }
}
