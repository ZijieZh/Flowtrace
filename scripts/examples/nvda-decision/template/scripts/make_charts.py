#!/usr/bin/env python3
"""build_charts — render the four research charts from the real indicator series.

Chart style is fixed in code, so every run produces the same chart format.
Reads ingest_price/indicators.parquet + price_pack.json + entry_levels/entry_levels.json.

Usage:
    python3 scripts/make_charts.py \
      --indicators runs/<RUN>/ingest_price/indicators.parquet \
      --price-pack runs/<RUN>/ingest_price/price_pack.json \
      --entry-levels runs/<RUN>/entry_levels/entry_levels.json \
      --out-dir runs/<RUN>/build_charts
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

INK, ACC, GRID = "#1B365D", "#b4532a", "#d8d2c4"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--indicators", required=True)
    p.add_argument("--price-pack", required=True)
    p.add_argument("--entry-levels", required=True)
    p.add_argument("--out-dir", required=True)
    a = p.parse_args()

    df = pd.read_parquet(a.indicators).copy(); df["date"] = pd.to_datetime(df["date"])
    pack = json.load(open(a.price_pack)); ent = json.load(open(a.entry_levels))
    out = Path(a.out_dir); out.mkdir(parents=True, exist_ok=True)
    tkr = pack["ticker"]; asof = pack["as_of"]

    plt.rcParams.update({"font.family": "sans-serif", "axes.edgecolor": "#666",
                          "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6,
                          "figure.facecolor": "white", "axes.facecolor": "white"})
    view = df.tail(190).reset_index(drop=True); x = view["date"]
    datefmt = mdates.DateFormatter("%b '%y")

    # 1 · price + MAs + Bollinger + levels
    fig, ax = plt.subplots(figsize=(10, 5.2))
    ax.fill_between(x, view["bb_lower"], view["bb_upper"], color=INK, alpha=0.06, label="Bollinger 20,2")
    ax.plot(x, view["close"], color=INK, lw=1.8, label="Close")
    ax.plot(x, view["ma_20"], color="#3a7d44", lw=1.1, label="MA20")
    ax.plot(x, view["ma_50"], color="#c79a00", lw=1.1, label="MA50")
    ax.plot(x, view["ma_200"], color=ACC, lw=1.1, ls="--", label="MA200")
    ax.axhspan(ent["entry_zone"][0], ent["entry_zone"][1], color="#3a7d44", alpha=0.10)
    ax.axhline(ent["stop"], color="#b00020", lw=1.0, ls=":", label=f"Stop ${ent['stop']}")
    if pack["resistance_levels"]:
        ax.axhline(pack["resistance_levels"][0], color=ACC, lw=1.0, ls="--", label=f"Resistance ${pack['resistance_levels'][0]}")
    ax.axhline(pack["week52_low"], color="#999", lw=0.8, ls=":")
    ax.annotate(f"  last ${pack['last_close']}", xy=(x.iloc[-1], view["close"].iloc[-1]),
                color=INK, fontsize=9, fontweight="bold", va="center")
    ax.set_title(f"{tkr} — Price, Moving Averages & Bollinger Bands (as of {asof})", fontsize=12, color=INK, fontweight="bold")
    ax.set_ylabel("Price ($)"); ax.legend(loc="upper left", fontsize=8, ncol=2, framealpha=0.9)
    ax.xaxis.set_major_formatter(datefmt); fig.tight_layout(); fig.savefig(out/"price.png", dpi=150); plt.close(fig)

    # 2 · RSI
    fig, ax = plt.subplots(figsize=(10, 2.6))
    ax.plot(x, view["rsi_14"], color=INK, lw=1.4)
    ax.axhline(70, color="#b00020", lw=0.8, ls="--"); ax.axhline(30, color="#3a7d44", lw=0.8, ls="--")
    ax.axhline(50, color="#aaa", lw=0.6, ls=":")
    ax.fill_between(x, 70, view["rsi_14"], where=view["rsi_14"]>=70, color="#b00020", alpha=0.2)
    ax.fill_between(x, 30, view["rsi_14"], where=view["rsi_14"]<=30, color="#3a7d44", alpha=0.2)
    ax.set_ylim(0, 100); ax.set_ylabel("RSI 14")
    ax.annotate(f"{view['rsi_14'].iloc[-1]:.0f}", xy=(x.iloc[-1], view["rsi_14"].iloc[-1]), color=INK, fontsize=9, fontweight="bold", va="center")
    ax.set_title("RSI(14)", fontsize=11, color=INK)
    ax.xaxis.set_major_formatter(datefmt); fig.tight_layout(); fig.savefig(out/"rsi.png", dpi=150); plt.close(fig)

    # 3 · MACD
    fig, ax = plt.subplots(figsize=(10, 2.6))
    colors = np.where(view["macd_hist"]>=0, "#3a7d44", "#b00020")
    ax.bar(x, view["macd_hist"], color=colors, width=1.4, alpha=0.5)
    ax.plot(x, view["macd"], color=INK, lw=1.3, label="MACD")
    ax.plot(x, view["macd_signal"], color=ACC, lw=1.1, label="Signal")
    ax.axhline(0, color="#888", lw=0.7); ax.set_ylabel("MACD"); ax.legend(loc="upper left", fontsize=8)
    ax.set_title("MACD(12,26,9)", fontsize=11, color=INK)
    ax.xaxis.set_major_formatter(datefmt); fig.tight_layout(); fig.savefig(out/"macd.png", dpi=150); plt.close(fig)

    # 4 · drawdown (full window)
    roll = df["close"].cummax(); dd = (df["close"]/roll - 1)*100
    fig, ax = plt.subplots(figsize=(10, 2.6))
    ax.fill_between(df["date"], dd, 0, color="#b00020", alpha=0.25); ax.plot(df["date"], dd, color="#b00020", lw=1.0)
    ax.set_ylabel("Drawdown (%)")
    ax.set_title(f"Underwater plot — max drawdown {pack['max_drawdown_1y_pct']}%", fontsize=11, color=INK)
    ax.xaxis.set_major_formatter(datefmt); fig.tight_layout(); fig.savefig(out/"drawdown.png", dpi=150); plt.close(fig)

    print("charts:", ", ".join(sorted(f.name for f in out.glob("*.png"))))


if __name__ == "__main__":
    main()
