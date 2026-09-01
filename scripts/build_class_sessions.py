#!/usr/bin/env python3
"""Extract per-date class sessions (date, time, venue) for every course from the
official block timetables, and write them to data/classSessions.json.

Sources (relative to the repo's parent directory):
  ../Tentative Term 4 Time table.pdf   -> Term 4, blocks 16-17
  ../Time Table Term 4/*.pdf           -> Term 4, blocks 18-21
  ../Term 5/Term 5 (Tentative Time Table).xlsx -> Term 5, blocks 22-26

Timetable grid shape: row 1 = "Block N Week M" + weekday dates (each date spans
two venue columns), row 2 = venue per column (S02/S03/S04...), remaining rows =
a time slot per row with the course code (optionally "_A"/"_B" section suffix)
in the cell for that date+venue.
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parents[1] / "data" / "classSessions.json"

DATE_RE = re.compile(r"^([A-Z][a-z]+day),\s*([A-Za-z]+)\.?\s*(\d{1,2})$")
TIME_RE = re.compile(r"^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})")
BLOCK_RE = re.compile(r"^Block\s+(\d+)\s+Week\s+(\d+)", re.I)
CODE_RE = re.compile(r"^([A-Z]{4})(?:[_ ]+(?:Sec)?[_ ]*([A-D])?[_ ]*(\d)?[_ ]*([A-Za-z]+)?)?$")

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
# The source files spell months loosely ("Sept", "Augt"), so match on the first
# three letters only.
NON_VENUE = re.compile(r"exam|holiday|celebration", re.I)

# The term-wide tentative timetable used provisional codes for two Block 20/21
# courses that the published block timetables later renamed. Normalising here
# keeps both sources under one key so the priority rule below can supersede the
# tentative rows instead of leaving a stale duplicate course behind.
CODE_ALIASES = {"PSWT": "PWMC", "PDMT": "PMMC"}
EXAM_SLOTS = {"Morning": ("09:00", "12:00"), "Afternoon": ("13:30", "16:30")}


def norm(cell):
    if cell is None:
        return ""
    return re.sub(r"\s+", " ", str(cell)).strip()


def parse_date(text, academic_year_start=2026):
    """'Monday, Sept 01' -> ISO date. Jun-Dec falls in the AY start year."""
    m = DATE_RE.match(text)
    if not m:
        return None, None
    weekday, month_name, day = m.groups()
    month = MONTHS.get(re.sub(r"[^a-z]", "", month_name.lower())[:3])
    if not month:
        return None, None
    year = academic_year_start if month >= 6 else academic_year_start + 1
    return datetime(year, month, int(day)).strftime("%Y-%m-%d"), weekday[:3]


def parse_grid(rows, term, sessions, source, priority=0):
    """Walk a sheet's rows, picking up each 'Block N Week M' grid in turn."""
    block = None
    dates = rooms = None
    for row in rows:
        cells = [norm(c) for c in row]
        if not any(cells):
            continue
        head = cells[0]
        bm = BLOCK_RE.match(head)
        if bm or any(DATE_RE.match(c) for c in cells[1:]):
            parsed = [parse_date(c)[0] for c in cells]
            if bm and not any(parsed):
                rooms = [""] + cells[1:]
                continue
            if bm:
                block = int(bm.group(1))
            # Dates span two venue columns: carry each date forward until the next.
            dates = []
            current = None
            for c in cells:
                iso, weekday = parse_date(c)
                if iso:
                    current = (iso, weekday)
                elif c and not BLOCK_RE.match(c):
                    # A non-date, non-blank label (holiday text, "EB-EXAMS") ends the span.
                    if not DATE_RE.match(c):
                        pass
                dates.append(current)
            rooms = None
            continue
        if dates and rooms is None and not TIME_RE.match(head):
            rooms = cells
            continue
        tm = TIME_RE.match(head)
        if tm:
            start, end = tm.groups()
        elif head in EXAM_SLOTS:
            start, end = EXAM_SLOTS[head]
        else:
            continue
        if not (dates and rooms):
            continue
        for i, cell in enumerate(cells):
            if i == 0 or not cell or cell == "-":
                continue
            cm = CODE_RE.match(cell)
            if not cm or not dates[i]:
                continue
            code, section, group, suffix = cm.groups()
            code = CODE_ALIASES.get(code, code)
            label = rooms[i] if i < len(rooms) else ""
            # An exam/holiday column carries a label like "EB-EXAMS" where the
            # venue normally goes, so it is not a room.
            is_exam = head in EXAM_SLOTS or bool(label and NON_VENUE.search(label)) \
                or bool(suffix and NON_VENUE.search(suffix))
            room = None if (not label or label == "-" or NON_VENUE.search(label)) else label
            iso, weekday = dates[i]
            sessions.setdefault(code, []).append({
                "date": iso,
                "day": weekday,
                "start": start,
                "end": end,
                "room": room,
                "section": (section or "") + (group or "") or None,
                "exam": is_exam,
                "block": block,
                "term": term,
                "source": source,
                "priority": priority,
            })


def from_pdf(path, term, sessions, priority=0):
    import pdfplumber
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                parse_grid(table, term, sessions, path.name, priority)


def from_xlsx(path, term, sessions, priority=0):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    for ws in wb:
        parse_grid(ws.iter_rows(values_only=True), term, sessions, f"{path.name}::{ws.title}", priority)


def main():
    sessions = {}
    from_pdf(ROOT / "Tentative Term 4 Time table.pdf", 4, sessions)
    for pdf in sorted((ROOT / "Time Table Term 4").glob("*.pdf")):
        from_pdf(pdf, 4, sessions, priority=1)
    from_xlsx(ROOT / "Term 5" / "Term 5 (Tentative Time Table).xlsx", 5, sessions, priority=1)

    out = {}
    for code, items in sorted(sessions.items()):
        # A block published as its own timetable supersedes the term-wide
        # tentative version for that block.
        best = {}
        for s in items:
            best[s["block"]] = max(best.get(s["block"], 0), s["priority"])
        items = [s for s in items if s["priority"] == best[s["block"]]]
        # Dedupe: the same class can appear in both the tentative and block-level file.
        seen, unique = set(), []
        for s in sorted(items, key=lambda s: (s["date"], s["start"], s["section"] or "")):
            key = (s["date"], s["start"], s["end"], s["section"], s["room"], s["exam"])
            if key in seen:
                continue
            seen.add(key)
            unique.append(s)
        out[code] = {
            "code": code,
            "term": unique[0]["term"],
            "blocks": sorted({s["block"] for s in unique if s["block"]}),
            "sections": sorted({s["section"] for s in unique if s["section"]}),
            "rooms": sorted({s["room"] for s in unique if s["room"]}),
            "firstClass": unique[0]["date"],
            "lastClass": unique[-1]["date"],
            "sessionCount": len(unique),
            "examCount": sum(1 for s in unique if s["exam"]),
            "sessions": [
                {k: s[k] for k in ("date", "day", "start", "end", "room", "section", "exam")}
                for s in unique
            ],
        }

    OUT.write_text(json.dumps(out, indent=2) + "\n")
    for code, c in out.items():
        print(f"{code}  term {c['term']}  blocks {c['blocks']}  "
              f"{c['sessionCount']:3d} sessions  {c['firstClass']}..{c['lastClass']}  "
              f"rooms {','.join(c['rooms']) or '-'}  sections {','.join(c['sections']) or '-'}")
    print(f"\n{len(out)} courses -> {OUT}")


if __name__ == "__main__":
    sys.exit(main())
