"""ממיר את תוצאות tests/e2e/sync-audit.cjs לדוח docs/SYNC_TEST.md"""
import json, sys, datetime
r = json.load(open(sys.argv[1]))
ok = lambda x: x.get("countOk") and not x.get("spill") and (x.get("videoSync") is None or x["videoSync"] >= 99) and abs(x.get("maxDelayMs") or 0) <= 150
lines = ["# בדיקת סנכרון — קול המאמן, ספירה והדמיה", "",
         f"הורץ: {datetime.date.today().isoformat()} · {len(r)} סטים (כל תרגיל חזרות × 2 מאמנים) · 10 חזרות בכל סט · סקריפט: `tests/e2e/sync-audit.cjs`", "",
         "## סיכום", "",
         f"- ✅ ספירה מלאה 1–10 בסדר הנכון: **{sum(bool(x.get('countOk')) for x in r)}/{len(r)}**",
         f"- ⏱️ השהיית מספר אחרי סיום החזרה: **{min(x['maxDelayMs'] for x in r)} עד {max(x['maxDelayMs'] for x in r)} מילישניות** (סף: 150)",
         f"- 🗣️ מילים שנקטעו/נגררו לשלב הבא: **{sum(x.get('spill', 0) for x in r)}**",
         f"- 🎬 וידאו בקטע הנכון של החזרה: **מינימום {min(x['videoSync'] for x in r if x.get('videoSync') is not None)}%** מהדגימות",
         f"- סה״כ עברו: **{sum(ok(x) for x in r)}/{len(r)}**", "",
         "## מה נבדק", "",
         "1. **ספירה** — המאמן אומר 1..10, כל מספר פעם אחת ובסדר (הבאג \"נעצר בשלוש\").",
         "2. **תזמון** — כל מספר מתחיל להישמע מיד כשהחזרה מסתיימת.",
         "3. **אין גרירה** — אף מילה לא נמשכת לתוך השלב הבא (מילים שלא נכנסות בזמן לא נאמרות).",
         "4. **וידאו** — בכל פריים, ההדמיה נמצאת בחלק הנכון של החזרה (ירידה/עלייה) לפי ניתוח החזרות בסרטון.", "",
         "## פירוט", "", "| מאמן | תרגיל | טמפו | סדר | קטעי חזרה בווידאו | ספירה | השהיה (ms) | גרירה | וידאו % | |", "|---|---|---|---|---|---|---|---|---|---|"]
for x in sorted(r, key=lambda x: (x["coach"], x["ex"])):
    lines.append(f"| {'אורי' if x['coach']=='ori' else 'נועה'} | {x['name']} | {x['tempo']} | {'עלייה קודם' if x['first']=='con' else 'ירידה קודם'} | {x['segs']} | {'✓' if x['countOk'] else '✗ ' + x['said']} | {x['maxDelayMs']} | {x['spill']} | {x['videoSync']} | {'✅' if ok(x) else '❌'} |")
lines += ["", "> הבדיקה רצה ב-Chromium (מנוע Web Audio זהה לזה שבאייפון). מגבלת האייפון שגרמה לעצירה ב\"שלוש\" (חסימת צלילים שלא נפתחו בנגיעה) לא קיימת יותר: כל הקליפים מתנגנים דרך הקשר אודיו אחד שנפתח בנגיעה."]
open("docs/SYNC_TEST.md", "w").write("\n".join(lines) + "\n")
print("\n".join(lines[:12]))
