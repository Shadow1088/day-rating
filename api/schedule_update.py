"""Vercel serverless function (Python) - update the Google Doc with the
day's Škola Online schedule when invoked by the Vercel Cron job.

Called by cron => GET /api/schedule_update (see vercel.json `crons`).

Environment variables (configure in Vercel project settings + local .env for
dev):
  SOL_USERNAME             Škola Online login
  SOL_PASSWORD             Škola Online password
  SOL_BASE_URL             default https://aplikace.skolaonline.cz
  SOL_EXAM_DAYS            default 7
  GOOGLE_DOC_ID            the Google Doc to overwrite
  GOOGLE_SA_KEY_B64        base64 of the service-account key JSON
"""
import base64
import json
import os
import re
from datetime import date, datetime, time, timedelta
from http.server import BaseHTTPRequestHandler

import requests
import google.auth.transport.requests
from bs4 import BeautifulSoup
from google.oauth2 import service_account
from googleapiclient.discovery import build

LOGIN_PATH = "/SOL/Prihlaseni.aspx"
CALENDAR_PATH = "/SOL/App/Kalendar/KZK001_KalendarTyden.aspx"
LOGIN_FIELD_USERNAME = "JmenoUzivatele"
LOGIN_FIELD_PASSWORD = "HesloUzivatele"
LOGIN_BUTTON = "btnLogin"

_CZ_DAY = {"Po": 0, "Út": 1, "St": 2, "Čt": 3, "Pá": 4, "So": 5, "Ne": 6}
_TIME_BY_HOUR = [
    (7, 10, 7, 55),
    (8, 0, 8, 45),
    (8, 50, 9, 35),
    (9, 45, 10, 30),
    (10, 50, 11, 35),
    (11, 40, 12, 25),
    (12, 30, 13, 15),
    (13, 20, 14, 5),
    (14, 10, 14, 55),
    (15, 0, 15, 45),
    (15, 50, 16, 35),
]

CZECH_DAYS = [
    "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle",
]
CZECH_MONTHS = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince",
]


class SolError(RuntimeError):
    pass


def _cfg():
    username = os.environ.get("SOL_USERNAME", "")
    password = os.environ.get("SOL_PASSWORD", "")
    base_url = os.environ.get("SOL_BASE_URL", "https://aplikace.skolaonline.cz").rstrip("/")
    exam_days = int(os.environ.get("SOL_EXAM_DAYS", "7"))
    doc_id = os.environ.get("GOOGLE_DOC_ID", "")
    sa_b64 = os.environ.get("GOOGLE_SA_KEY_B64", "")
    return {
        "username": username,
        "password": password,
        "base_url": base_url,
        "exam_days": exam_days,
        "doc_id": doc_id,
        "sa_b64": sa_b64,
    }


def _parse_hidden_inputs(html):
    soup = BeautifulSoup(html, "html.parser")
    inputs = {}
    for tag in soup.find_all("input", attrs={"type": "hidden"}):
        name = tag.get("name")
        value = tag.get("value", "")
        if name:
            inputs[name] = value
    return inputs


def _login(cfg):
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            )
        }
    )
    login_url = cfg["base_url"] + LOGIN_PATH
    resp = session.get(login_url, timeout=30)
    resp.raise_for_status()

    data = _parse_hidden_inputs(resp.text)
    data[LOGIN_FIELD_USERNAME] = cfg["username"]
    data[LOGIN_FIELD_PASSWORD] = cfg["password"]
    data[LOGIN_BUTTON] = "Přihlásit do aplikace"
    data["ReturnUrlSOL"] = CALENDAR_PATH

    resp = session.post(login_url, data=data, timeout=30, allow_redirects=True)
    resp.raise_for_status()

    if "Neplatné uživatelské jméno" in resp.text:
        raise SolError("Login failed: bad username or password.")
    if CALENDAR_PATH not in resp.url and "hlavni" not in resp.url.lower():
        if "JmenoUzivatele" in resp.text and "btnLogin" in resp.text:
            raise SolError("Login did not complete (still on login form).")
    return session


def _fetch_calendar(session, cfg):
    url = cfg["base_url"] + CALENDAR_PATH
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def _parse_day_headers(soup_main):
    result = []
    for th in soup_main.find_all("th"):
        text = th.get_text(" ", strip=True)
        m = re.match(r"^(Po|Út|St|Čt|Pá|So|Ne)\s+(\d+)\.(\d+)\.", text)
        if m:
            result.append((m.group(1), int(m.group(2)), int(m.group(3))))
    return result


def _resolve_year(day_num, month_num, today):
    candidate = date(today.year, month_num, day_num)
    if abs((candidate - today).days) > 183:
        year = today.year + 1 if month_num < today.month else today.year - 1
        candidate = date(year, month_num, day_num)
    return candidate


def _decode_cell_id(cell_id):
    parts = cell_id.split("#")
    try:
        if len(parts) == 5 and parts[2] == "D":
            return int(parts[3]), int(parts[4])
        if len(parts) == 4:
            return int(parts[2]), int(parts[3])
    except (ValueError, IndexError):
        pass
    return None, None


def _full_subject_name(td, subject):
    """Return the full subject name from the cell's tooltip title."""
    m = re.search(r"Tooltip\('([^']*)'", td.get("onmouseover", ""))
    if m:
        title = m.group(1).strip()
        inner = re.search(r"\((.*)\)", title)
        if inner and inner.group(1).strip():
            return inner.group(1).strip()
        if title:
            return title
    return subject


def _hours_by_day(soup_main):
    hours = {}
    for td in soup_main.find_all("td"):
        cell_id = td.get("id", "")
        if not cell_id.startswith("C") or "#" not in cell_id:
            continue
        hour, day = _decode_cell_id(cell_id)
        if hour is None:
            continue
        wrapper = td.find_parent("td", class_=lambda c: c and "DctCell" in c)
        colspan = 1
        if wrapper is not None and wrapper.get("colspan"):
            try:
                colspan = int(wrapper.get("colspan"))
            except ValueError:
                pass
        hour_end = hour + colspan - 1
        nadpis = td.find("span", class_="KuvBunkaRozvrhNadpis")
        text = td.find("span", class_="KuvBunkaRozvrhText")
        subject = nadpis.get_text(" ", strip=True) if nadpis else ""
        subject = _full_subject_name(td, subject)
        class_room = text.get_text(" ", strip=True) if text else ""
        classes = " ".join(td.get("class") or [])
        if "KuvSuplovanaHodina" in classes:
            kind = "replaced"
        elif "KuvSuplujiciHodina" in classes:
            kind = "replacement"
        elif "KuvSkolniAkceHodina" in classes:
            kind = "action"
        else:
            kind = "lesson"
        hours.setdefault(day, []).append((hour, hour_end, subject, class_room, kind))
    return hours


def _parse_schedule(html, target_date):
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("table", class_="DctTable")
    if main is None:
        return []

    day_headers = _parse_day_headers(main)
    tz_headers = [h for h in day_headers if h[0]]
    header_dates = []
    for name, d, m in tz_headers:
        resolved = _resolve_year(d, m, target_date)
        header_dates.append((resolved, _CZ_DAY.get(name)))

    lessons = []
    for day_idx, per_hour in _hours_by_day(main).items():
        if day_idx >= len(header_dates):
            continue
        day_date, _ = header_dates[day_idx]
        if day_date != target_date:
            continue
        for hour_idx, hour_end, subject, class_room, kind in per_hour:
            if kind == "replaced":
                continue
            begin, end = ("", "")
            if 0 <= hour_idx < len(_TIME_BY_HOUR):
                b = _TIME_BY_HOUR[hour_idx]
                e = _TIME_BY_HOUR[min(hour_end, len(_TIME_BY_HOUR) - 1)]
                begin, end = (
                    time(b[0], b[1]).strftime("%H:%M"),
                    time(e[2], e[3]).strftime("%H:%M"),
                )
            room = ""
            if class_room:
                parts = class_room.split()
                if len(parts) == 2:
                    room = parts[-1]
            lessons.append(
                {
                    "begin": begin,
                    "end": end,
                    "subject": subject,
                    "room": room,
                    "kind": kind,
                }
            )

    lessons.sort(key=lambda l: (l["begin"], l["subject"]))
    merged = []
    for lesson in lessons:
        if merged and (merged[-1]["begin"], merged[-1]["end"], merged[-1]["subject"]) == (
            lesson["begin"],
            lesson["end"],
            lesson["subject"],
        ):
            if lesson["room"] and merged[-1]["room"] != lesson["room"]:
                merged[-1]["room"] += ", " + lesson["room"]
            continue
        merged.append(dict(lesson))
    return merged


def _parse_substitutions(html, target_date):
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("table", class_="DctTable")
    if main is None:
        return []

    day_headers = _parse_day_headers(main)
    tz_headers = [h for h in day_headers if h[0]]
    header_dates = []
    for name, d, m in tz_headers:
        resolved = _resolve_year(d, m, target_date)
        header_dates.append((resolved, _CZ_DAY.get(name)))

    replaced_by_slot = {}
    substitutions = []
    for day_idx, per_hour in _hours_by_day(main).items():
        if day_idx >= len(header_dates):
            continue
        day_date, _ = header_dates[day_idx]
        if day_date != target_date:
            continue

        for hour_idx, hour_end, subject, class_room, kind in per_hour:
            if kind == "replaced":
                replaced_by_slot.setdefault(hour_idx, []).append(subject)

        for hour_idx, hour_end, subject, class_room, kind in per_hour:
            if kind != "replacement":
                continue
            originals = replaced_by_slot.get(hour_idx, [])
            if not originals:
                continue
            begin, end = ("", "")
            if 0 <= hour_idx < len(_TIME_BY_HOUR):
                b = _TIME_BY_HOUR[hour_idx]
                e = _TIME_BY_HOUR[min(hour_end, len(_TIME_BY_HOUR) - 1)]
                begin, end = (
                    time(b[0], b[1]).strftime("%H:%M"),
                    time(e[2], e[3]).strftime("%H:%M"),
                )
            room = ""
            if class_room:
                parts = class_room.split()
                if len(parts) == 2:
                    room = parts[-1]
            for original in originals:
                if subject == original:
                    continue
                substitutions.append(
                    {
                        "begin": begin,
                        "end": end,
                        "subject": subject,
                        "replaced": original,
                        "room": room,
                    }
                )
    substitutions.sort(key=lambda s: (s["begin"], s["subject"]))
    return substitutions


def _format_date_czech(dt):
    return f"{dt.day}. {CZECH_MONTHS[dt.month - 1]} {dt.year}"


def _format_date_full_czech(dt):
    return f"{_format_date_czech(dt)} ({CZECH_DAYS[dt.weekday()]})"


def _format_lesson(lesson):
    begin = lesson.get("begin", "")
    end = lesson.get("end", "")
    subject = lesson.get("subject", "?")
    room = lesson.get("room")
    time_s = f"{begin}–{end}" if begin and end else "??:??"
    if room:
        return f"{time_s} | {subject} | Učebna {room}"
    return f"{time_s} | {subject}"


def _format_substitution(sub):
    begin = sub.get("begin", "")
    end = sub.get("end", "")
    subject = sub.get("subject", "?")
    replaced = sub.get("replaced", "?")
    room = sub.get("room")
    time_s = f"{begin}–{end}" if begin and end else "??:??"
    line = f"{time_s} | {subject} místo {replaced}"
    if room:
        line += f" | Učebna {room}"
    return line


def _build_comprehension(days):
    lines = []
    for day, lessons, substitutions in days:
        lines.append(f"Rozvrh pro {_format_date_full_czech(day)}")
        lines.append("=" * 45)
        lines.append("")

        if lessons:
            for lesson in lessons:
                lines.append(_format_lesson(lesson))
        else:
            lines.append("Žádné hodiny.")

        if substitutions:
            lines.append("")
            lines.append("Suplování:")
            for sub in substitutions:
                lines.append(_format_substitution(sub))

        lines.append("")

    lines.append("Následující zkoušky:")
    lines.append("Žádné zkoušky v daném období.")
    return "\n".join(lines)


def _google_credentials(cfg):
    key_json = base64.b64decode(cfg["sa_b64"]).decode("utf-8")
    info = json.loads(key_json)
    return service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive"]
    )


def _write_doc(cfg, doc_id, text):
    creds = _google_credentials(cfg)
    docs = build("docs", "v1", credentials=creds)
    document = docs.documents().get(documentId=doc_id).execute()
    body = document.get("body", {})
    end_index = body.get("content", [{}])[-1].get("endIndex", 1)

    delete = [
        {
            "deleteContentRange": {
                "range": {"startIndex": 1, "endIndex": end_index - 1}
            }
        }
    ]

    lines = text.split("\n")
    insert = []
    index = 1
    for i, line in enumerate(lines):
        if line:
            insert.append({"insertText": {"location": {"index": index}, "text": line}})
            index += len(line)
        if i < len(lines) - 1:
            insert.append({"insertText": {"location": {"index": index}, "text": "\n"}})
            index += 1

    docs.documents().batchUpdate(
        documentId=doc_id, body={"requests": delete + insert}
    ).execute()


def _run_update():
    cfg = _cfg()
    missing = [k for k in ("username", "password", "doc_id", "sa_b64") if not cfg[k]]
    if missing:
        raise SolError(f"Missing env vars: {', '.join(missing)}")

    session = _login(cfg)
    html = _fetch_calendar(session, cfg)

    days = []
    today = date.today()
    for day in (today, today + timedelta(days=1)):
        lessons = _parse_schedule(html, day)
        substitutions = _parse_substitutions(html, day)
        days.append((day, lessons, substitutions))

    text = _build_comprehension(days)
    _write_doc(cfg, cfg["doc_id"], text)
    return text


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            text = _run_update()
            body = f"OK\n{text}".encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:  # noqa: BLE001
            msg = f"ERROR: {exc}".encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(_run_update())