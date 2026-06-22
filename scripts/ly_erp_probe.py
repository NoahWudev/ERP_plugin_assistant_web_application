#!/usr/bin/env python3
"""凌越 ERP WCF/SOAP 連線探測：LyGetPassKey → LyDataOut（000000 貨品主檔）。

用法：
  1. 複製 .env.example 為 .env，填入凌越 API 連線資訊
  2. python3 scripts/ly_erp_probe.py
  3. 若不確定服務位址：python3 scripts/ly_erp_probe.py --discover

僅供後端整合前驗證，請勿把憑證暴露給前端（勿使用 VITE_ 前綴）。
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import textwrap
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV = ROOT / ".env"
# LyDataOut imode：30 位；第 2 碼為 1，其餘為 0（與 backend/ly_erp/config.py 一致）
LY_DATA_OUT_IMODE = "0" + "1" + "0" * 28

COMMON_SERVICE_PATHS = (
    "ErpService.svc",
    "LyDataIO.svc",
    "LyData.svc",
    "LYDataIO.svc",
    "lydataio.svc",
    "DataIO.svc",
    "ERPData.svc",
)

SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
DEFAULT_TARGET_NS = "http://tempuri.org/"
DEFAULT_SOAP_INTERFACE = "IErpService"


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def soap_post(url: str, action: str, body_inner: str, timeout: float) -> str:
    envelope = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="{SOAP_NS}">
  <soap:Body>
    {body_inner}
  </soap:Body>
</soap:Envelope>"""
    req = urllib.request.Request(
        url,
        data=envelope.encode("utf-8"),
        headers={
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": action,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch_text(url: str, timeout: float) -> str:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def find_first_text(root: ET.Element, names: tuple[str, ...]) -> str | None:
    wanted = set(names)
    for elem in root.iter():
        if local_name(elem.tag) in wanted and elem.text is not None:
            text = elem.text.strip()
            if text:
                return text
    return None


def parse_pass_key(xml_text: str) -> str | None:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return None
    for name in (
        "LyGetPassKeyResult",
        "lyGetPassKeyResult",
        "GetPassKeyResult",
        "passKey",
        "PassKey",
    ):
        value = find_first_text(root, (name,))
        if value is not None:
            return value
    # 有些服務直接回傳字串在 Body 第一個葉節點
    for elem in root.iter():
        if list(elem):
            continue
        if elem.text and elem.text.strip() and local_name(elem.tag) not in {"Envelope", "Body"}:
            return elem.text.strip()
    return None


def parse_data_out(xml_text: str) -> dict[str, str]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return {"raw": xml_text}

    result: dict[str, str] = {}
    for elem in root.iter():
        name = local_name(elem.tag)
        if elem.text is None:
            continue
        text = elem.text.strip()
        if not text:
            continue
        if name in {
            "LyDataOutResult",
            "lyDataOutResult",
            "ixmlda",
            "iXmlda",
            "IXMLDA",
            "itotrec",
            "iTotrec",
            "ITOTREC",
            "itmpnm",
            "iTmpnm",
            "ITMPNM",
        }:
            result[name] = text
    if not result:
        result["raw"] = xml_text
    return result


def soap_action(target_ns: str, interface: str, operation: str) -> str:
    ns = target_ns if target_ns.endswith("/") else f"{target_ns}/"
    return f'"{ns}{interface}/{operation}"'


def build_operation_xml(
    operation: str,
    target_ns: str,
    params: dict[str, str],
) -> str:
    parts = [f'<{operation} xmlns="{target_ns}">']
    for key, value in params.items():
        parts.append(f"  <{key}>{xml_escape(value)}</{key}>")
    parts.append(f"</{operation}>")
    return "\n".join(parts)


def xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def discover_services(base_url: str, timeout: float) -> list[str]:
    base = base_url.rstrip("/") + "/"
    hits: list[str] = []
    for path in COMMON_SERVICE_PATHS:
        wsdl_url = base + path + "?wsdl"
        try:
            text = fetch_text(wsdl_url, timeout)
        except Exception:
            continue
        if "wsdl" in text.lower() and (
            "LyGetPassKey" in text or "LyDataOut" in text or "lygetpasskey" in text.lower()
        ):
            hits.append(base + path)
    return hits


def print_config_help() -> None:
    print(
        textwrap.dedent(
            """
            缺少連線設定。請建立 .env（可從 .env.example 複製）並填入：

              LY_ERP_SOAP_URL=http://<主機>/ERPAPI/<服務>.svc
              LY_ERP_COMPANY_CODE=<公司代號 icpno>
              LY_ERP_USER=<API 帳號 pusid>
              LY_ERP_PASSWORD=<API 密碼 pverifykey>

            若不確定服務檔名，可先執行：
              python3 scripts/ly_erp_probe.py --discover --base-url http://<主機>/ERPAPI
            """
        ).strip()
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="凌越 ERP 000000 貨品主檔連線探測")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV))
    parser.add_argument("--discover", action="store_true", help="掃描常見 .svc 位址（需 --base-url）")
    parser.add_argument("--base-url", default="", help="例如 http://192.168.1.10/ERPAPI")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--limit", type=int, default=0, help="覆寫 LY_ERP_FETCH_LIMIT")
    args = parser.parse_args()

    load_env_file(Path(args.env_file))

    timeout = args.timeout
    if args.discover:
        base_url = args.base_url or env("LY_ERP_BASE_URL")
        if not base_url:
            print("請提供 --base-url 或 .env 的 LY_ERP_BASE_URL", file=sys.stderr)
            return 2
        print(f"掃描 WSDL：{base_url.rstrip('/')}/")
        hits = discover_services(base_url, timeout)
        if not hits:
            print("未找到含 LyGetPassKey / LyDataOut 的服務。請向凌越顧問確認實際 .svc 路徑。")
            return 1
        print("找到以下候選服務：")
        for hit in hits:
            print(f"  - {hit}")
        print("\n請將其中一個寫入 .env 的 LY_ERP_SOAP_URL 後再執行探測。")
        return 0

    soap_url = env("LY_ERP_SOAP_URL")
    company_code = env("LY_ERP_COMPANY_CODE")
    user = env("LY_ERP_USER")
    password = env("LY_ERP_PASSWORD")
    data_kind = env("LY_ERP_DATA_KIND", "000000")
    target_ns = env("LY_ERP_TARGET_NS", DEFAULT_TARGET_NS)
    soap_interface = env("LY_ERP_SOAP_INTERFACE", DEFAULT_SOAP_INTERFACE)
    fetch_limit = args.limit or int(env("LY_ERP_FETCH_LIMIT", "5") or "5")
    fields = env("LY_ERP_FIELDS", "SK_NO,SK_NAME,SK_UNIT,SK_SPEC")

    missing = [
        name
        for name, value in (
            ("LY_ERP_SOAP_URL", soap_url),
            ("LY_ERP_COMPANY_CODE", company_code),
            ("LY_ERP_USER", user),
            ("LY_ERP_PASSWORD", password),
        )
        if not value
    ]
    if missing:
        print_config_help()
        print(f"\n缺少：{', '.join(missing)}", file=sys.stderr)
        return 2

    print("=== 1/2 LyGetPassKey ===")
    print(f"URL: {soap_url}")
    pass_key_body = build_operation_xml(
        "LyGetPassKey",
        target_ns,
        {"pusid": user, "pverifykey": password},
    )
    pass_key_action = soap_action(target_ns, soap_interface, "LyGetPassKey")

    try:
        pass_key_xml = soap_post(soap_url, pass_key_action, pass_key_body, timeout)
    except urllib.error.HTTPError as exc:
        print(f"HTTP 錯誤 {exc.code}：{exc.reason}", file=sys.stderr)
        body = exc.read().decode("utf-8", errors="replace")
        print(body[:2000], file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"無法連線：{exc.reason}", file=sys.stderr)
        print("請確認 VPN / 防火牆 / 服務位址是否正確。", file=sys.stderr)
        return 1

    pass_key = parse_pass_key(pass_key_xml)
    if pass_key is None:
        print("無法解析金鑰，原始回應：")
        print(pass_key_xml[:4000])
        return 1

    if re.fullmatch(r"-\d+", pass_key):
        print(f"取得金鑰失敗，錯誤碼：{pass_key}")
        print(
            "對照：-1 SQL 連線失敗；-2 帳密/寫入失敗；-3 金鑰逾時；-4 金鑰不合法；-5 無權限"
        )
        return 1

    masked = pass_key[:4] + "..." + pass_key[-4:] if len(pass_key) > 10 else "(short)"
    print(f"金鑰取得成功：{masked}")

    print("\n=== 2/2 LyDataOut（貨品 000000）===")
    data_out_body = build_operation_xml(
        "LyDataOut",
        target_ns,
        {
            "ikye": pass_key,
            "icpno": company_code,
            "idakd": data_kind,
            "ifld": fields,
            "idetfields": "",
            "irwhere": "",
            "iwhval": "",
            "irec": str(fetch_limit),
            "imode": LY_DATA_OUT_IMODE,
            "iorder": "",
        },
    )
    data_out_action = soap_action(target_ns, soap_interface, "LyDataOut")

    try:
        data_out_xml = soap_post(soap_url, data_out_action, data_out_body, timeout)
    except urllib.error.HTTPError as exc:
        print(f"HTTP 錯誤 {exc.code}：{exc.reason}", file=sys.stderr)
        body = exc.read().decode("utf-8", errors="replace")
        print(body[:2000], file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"無法連線：{exc.reason}", file=sys.stderr)
        return 1

    parsed = parse_data_out(data_out_xml)
    status = parsed.get("LyDataOutResult") or parsed.get("lyDataOutResult")
    if status is not None and re.fullmatch(r"-?\d+", status) and int(status) < 0:
        print(f"LyDataOut 失敗，錯誤碼：{status}")
        print(data_out_xml[:4000])
        return 1

    xml_payload = (
        parsed.get("ixmlda")
        or parsed.get("iXmlda")
        or parsed.get("IXMLDA")
        or parsed.get("raw", "")
    )
    total = parsed.get("itotrec") or parsed.get("iTotrec") or parsed.get("ITOTREC")
    tmp_name = parsed.get("itmpnm") or parsed.get("iTmpnm") or parsed.get("ITMPNM")

    if total:
        print(f"總筆數 itotrec：{total}")
    if tmp_name:
        print(f"分頁暫存檔 itmpnm：{tmp_name}")

    print("\n--- 回傳 XML（前 4000 字）---")
    print(xml_payload[:4000])

    if "<SK_NO" in xml_payload.upper() or "<LYDATATITLE" in xml_payload.upper():
        print("\n✓ 看起來已成功取得貨品主檔 XML。")
        return 0

    if status in {"0", "00"}:
        print("\n✓ LyDataOut 回傳成功（請檢查上方 XML 內容）。")
        return 0

    print("\n回應已收到，但尚未確認 XML 格式。若為 SOAPAction/命名空間錯誤，可調整 LY_ERP_TARGET_NS。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
