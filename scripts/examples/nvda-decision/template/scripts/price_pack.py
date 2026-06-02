#!/usr/bin/env python3
"""ingest_price — fetch OHLCV for a ticker and compute the indicator stack.

Writes <out-dir>/price_pack.json (summary) and <out-dir>/indicators.parquet
(full series, used by build_charts). Deterministic given the same market data.

Usage:
    python3 scripts/price_pack.py --ticker NVDA --lookback 1y --out-dir runs/<RUN>/ingest_price
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
import pandas as pd
import yfinance as yf


def fetch(ticker: str, lookback: str) -> pd.DataFrame:
    df = yf.Ticker(ticker).history(period=lookback, interval="1d", auto_adjust=True)
    if df.empty:
        raise RuntimeError(f"yfinance returned no rows for {ticker}")
    df = df.reset_index().rename(columns={"Date": "date", "Open": "open", "High": "high",
                                          "Low": "low", "Close": "close", "Volume": "volume"})
    df["date"] = pd.to_datetime(df["date"]).dt.date.astype(str)
    return df[["date", "open", "high", "low", "close", "volume"]]


def rsi_wilder(close: pd.Series, n: int = 14) -> pd.Series:
    d = close.diff(); g = d.clip(lower=0); l = -d.clip(upper=0)
    ag = g.ewm(alpha=1/n, adjust=False).mean(); al = l.ewm(alpha=1/n, adjust=False).mean()
    return 100 - 100 / (1 + ag / al.replace(0, np.nan))


def indicators(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy(); c = out["close"]
    out["ma_20"] = c.rolling(20).mean(); out["ma_50"] = c.rolling(50).mean(); out["ma_200"] = c.rolling(200).mean()
    out["rsi_14"] = rsi_wilder(c, 14)
    ema12 = c.ewm(span=12, adjust=False).mean(); ema26 = c.ewm(span=26, adjust=False).mean()
    out["macd"] = ema12 - ema26
    out["macd_signal"] = out["macd"].ewm(span=9, adjust=False).mean()
    out["macd_hist"] = out["macd"] - out["macd_signal"]
    std20 = c.rolling(20).std()
    out["bb_upper"] = out["ma_20"] + 2*std20; out["bb_lower"] = out["ma_20"] - 2*std20
    hl = out["high"]-out["low"]; hc = (out["high"]-c.shift()).abs(); lc = (out["low"]-c.shift()).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    out["atr_14"] = tr.ewm(alpha=1/14, adjust=False).mean(); out["atr_pct"] = out["atr_14"]/c
    return out


def cluster(levels, tol=0.02):
    out = []
    for v in sorted(levels):
        if out and abs(v-out[-1])/out[-1] < tol: out[-1] = (out[-1]+v)/2
        else: out.append(v)
    return [round(x, 2) for x in out]


def build_pack(df: pd.DataFrame, ticker: str, lookback: str) -> dict:
    latest = df.iloc[-1]; r = lambda x: round(float(x), 4); c = df["close"]; px = float(latest["close"])
    hi52 = float(df["high"].max()); lo52 = float(df["low"].min())
    win = df.tail(130).reset_index(drop=True); k = 5; piv_hi, piv_lo = [], []
    for i in range(k, len(win)-k):
        if win["high"].iloc[i] == win["high"].iloc[i-k:i+k+1].max(): piv_hi.append(float(win["high"].iloc[i]))
        if win["low"].iloc[i]  == win["low"].iloc[i-k:i+k+1].min():  piv_lo.append(float(win["low"].iloc[i]))
    res = sorted([v for v in cluster(piv_hi) if v > px])[:3]
    sup = sorted([v for v in cluster(piv_lo) if v < px], reverse=True)[:3]
    roll = c.cummax(); dd = (c-roll)/roll; mdd_i = int(dd.idxmin()); peak_i = int(c.iloc[:mdd_i+1].idxmax())
    return {
        "ticker": ticker, "as_of": str(latest["date"]), "lookback": lookback, "bars": int(len(df)),
        "last_close": r(latest["close"]), "week52_high": round(hi52, 2), "week52_low": round(lo52, 2),
        "pct_off_52w_high": round((px/hi52-1)*100, 1), "avg_volume": int(df["volume"].mean()),
        "indicators": {
            "ma_20": r(latest["ma_20"]), "ma_50": r(latest["ma_50"]), "ma_200": r(latest["ma_200"]),
            "rsi_14": round(float(latest["rsi_14"]), 2), "macd": r(latest["macd"]),
            "macd_signal": r(latest["macd_signal"]), "macd_hist": r(latest["macd_hist"]),
            "bb_upper": r(latest["bb_upper"]), "bb_lower": r(latest["bb_lower"]),
            "atr_14": r(latest["atr_14"]), "atr_pct": round(float(latest["atr_pct"])*100, 2),
        },
        "support_levels": sup, "resistance_levels": res,
        "max_drawdown_1y_pct": round(float(dd.min())*100, 1),
        "max_drawdown_window": [str(df.loc[peak_i, "date"]), str(df.loc[mdd_i, "date"])],
        "source": "yfinance daily OHLCV (auto-adjusted); indicators computed locally",
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ticker", required=True)
    p.add_argument("--lookback", default="1y")
    p.add_argument("--out-dir", required=True)
    a = p.parse_args()
    out = Path(a.out_dir); out.mkdir(parents=True, exist_ok=True)
    ind = indicators(fetch(a.ticker, a.lookback))
    ind.to_parquet(out / "indicators.parquet", index=False)
    pack = build_pack(ind, a.ticker, a.lookback)
    (out / "price_pack.json").write_text(json.dumps(pack, indent=2))
    print(json.dumps(pack, indent=2))


if __name__ == "__main__":
    main()
