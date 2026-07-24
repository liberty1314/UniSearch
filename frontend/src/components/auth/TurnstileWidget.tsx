import React, { useEffect, useRef } from "react";

// Cloudflare Turnstile 脚本地址（explicit render 模式）
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

interface TurnstileWindow extends Window {
  turnstile?: {
    render: (
      container: string | HTMLElement,
      options: {
        sitekey: string;
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
      },
    ) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId?: string) => void;
  };
}

// loadTurnstileScript 保证 Turnstile 脚本仅注入一次，并在其就绪后 resolve。
const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const w = window as TurnstileWindow;
    if (w.turnstile) {
      resolve();
      return;
    }

    const existing = document.getElementById(
      TURNSTILE_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Turnstile 脚本加载失败")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile 脚本加载失败"));
    document.head.appendChild(script);
  });
};

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

/**
 * TurnstileWidget 动态加载 Cloudflare Turnstile 并通过 explicit render 回调获取令牌。
 */
const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  onExpire,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!siteKey) {
      return;
    }

    loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        const w = window as TurnstileWindow;
        if (!w.turnstile || !containerRef.current) return;

        widgetIdRef.current = w.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onError?.(),
          theme: "auto",
        });
      })
      .catch(() => {
        if (!cancelled) {
          onError?.();
        }
      });

    return () => {
      cancelled = true;
      const w = window as TurnstileWindow;
      if (w.turnstile && widgetIdRef.current) {
        try {
          w.turnstile.remove(widgetIdRef.current);
        } catch {
          // 忽略卸载异常
        }
        widgetIdRef.current = null;
      }
    };
    // 仅在 siteKey 变化时重新渲染；回调以最新闭包引用保存在外层组件
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return <div ref={containerRef} className="flex justify-center" />;
};

export default TurnstileWidget;
