# Audit: milkflint-0.91a Wi‑Fi / hostapd / CAKE vs MilkFlint4 1.5→1.6

OddBlueDog **milkflint-0.91a** targets **GL-MT6000 (Flint 2)** on OpenWrt **25.12.6**.  
MilkFlint4 targets **GL-BE14000 (Flint 4)** on OpenWrt main / kernel **6.18** with a pinned mt76 (see `docs/V1.1-AUDIT.md` / release notes).

## Rule

Do **not** paste 0.91a kernel patches wholesale. For each candidate:

1. Does the same bug class exist on our tree / mt76 pin?
2. Does it interact with WED / MU-MIMO / MLO on MT7988?
3. Is there an upstream openwrt/mt76 commit we can cherry-pick instead?

## 0.91a claims (from release notes)

| Area | 0.91a summary | MilkFlint4 action |
|---|---|---|
| Upstream mt76 (15 fixes to 4d7f2bed) | A-MSDU/encrypted RX checks, BA scoreboard, stats/firmware logging, etc. | Diff against our pin; import only with WED regression matrix |
| MilkFlint mt76 tests | Frame length, locking, TWT, free order; `rx_drops` counter | Compare with our patches under `package/kernel` / mt76; keep test ideas |
| hostapd | 5s wait only on driver reply, not every station frame | Check our hostapd package; cherry-pick if still present |
| CAKE | Multi-queue DiffServ consistency, ACK filter 6in4, ECN/L4S, overflow guards, KUnit | We already ship cake_mq story; review deltas against `package/milkflint` / kernel CAKE |

## Status for 1.6

- [ ] Inventory MilkFlint4 mt76 commit pin vs openwrt/mt76 tip
- [ ] Map 0.91a hostapd change to our hostapd version
- [ ] Map CAKE KUnit/fixes to 6.18 tree
- [ ] Explicit **no-ship** list for Flint-2-only hunks

Until those boxes are checked, 1.6 ships **UX ports only** for the 0.91a wave; kernel remains “audit in progress.”
