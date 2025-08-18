"use client";

import React, { useEffect, useRef } from "react";

export default function LiveChart() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      new TradingView.widget({
        autosize: true,
        symbol: "NASDAQ:AAPL", // Change this to your preferred asset, e.g., "BINANCE:BTCUSDT"
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview_container",
      });
    };

    if (container.current) {
      container.current.innerHTML = ""; // Clear any previous widget
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Live Trading Chart</h1>
      <div id="tradingview_container" ref={container} style={{ height: "600px" }} />
    </div>
  );
}
