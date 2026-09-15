# Storm Skiing pass roster snapshot — 2026-27

Downloaded 2026-09-14 from Stuart Winchester’s public [Big Dumb Toolkit](https://www.stormskiing.com/p/a-big-dumb-toolkit-for-2026-27-ski).

Workbook: [docs.google.com/spreadsheets/d/1G2-l2DVg7-QwroOi7EqRDrJYJ4ICYLcJbLx-nARJdrA](https://docs.google.com/spreadsheets/d/1G2-l2DVg7-QwroOi7EqRDrJYJ4ICYLcJbLx-nARJdrA)

| File | Sheet gid | Toolkit link label |
| --- | --- | --- |
| `all-partners.csv` | `713651182` | All Epic, Ikon, Indy, Mountain Collective Partners |
| `pass-rosters-dashboard.csv` | `677843907` | Indy Pass (tab is a side-by-side dashboard of Indy / Ikon / Epic / Mountain Collective rosters) |

`all-partners.csv` is the join source: repeating regional tables, each with `Province`/`Country`, `Ski Area`, `National Pass`, plus `Epic`, `Epic Local`, `Ikon`, `Ikon Base`, `Ikon Session`, `Indy`, `Mountain Collective` access columns. First block is worldwide partners (~451 areas in Storm’s header totals).

CSV export of the Epic / Ikon / Mountain Collective gids (`1371127432`, `1703292867`, `1445438858`) returned HTTP 400 (`export?format=csv`). The gviz CSV endpoint ignored gid and dumped the full encyclopedia tab (~11 MB) — not kept.

Rosters and stats remain Storm’s; this folder is a dated snapshot for joining onto atlas `winter_sports_id`.
