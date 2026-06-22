from __future__ import annotations

import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass

from ly_erp.config import (
    DEFAULT_SOAP_INTERFACE,
    DEFAULT_TARGET_NS,
    LY_DATA_OUT_IMODE,
    PRODUCT_FIELDS,
    SOAP_NS,
    LyErpConfig,
)


@dataclass(frozen=True)
class ErpProduct:
    sku_no: str
    name: str
    spec: str
    unit: str

    def to_dict(self) -> dict[str, str]:
        return {
            "skuNo": self.sku_no,
            "name": self.name,
            "spec": self.spec,
            "unit": self.unit,
        }


class LyErpError(Exception):
    pass


class LyErpClient:
    def __init__(self, config: LyErpConfig) -> None:
        self._config = config
        self._pass_key: str | None = None
        self._pass_key_at = 0.0

    def search_products(self, query: str, limit: int = 20) -> list[ErpProduct]:
        keyword = query.strip()
        if not keyword:
            return []

        bounded_limit = max(1, min(limit, 50))
        filters: list[tuple[str, str]] = [
            ("SK_NO like '@v1@'", f"%{keyword}%"),
            ("SK_NAME like '@v1@'", f"%{keyword}%"),
            (f"SK_NO like '@v1@' or SK_NAME like '@v1@'", f"%{keyword}%"),
            ("SK_NO='@v1@'", keyword),
        ]

        for irwhere, iwhval in filters:
            products = self._fetch_products(
                irwhere=irwhere,
                iwhval=iwhval,
                limit=bounded_limit,
            )
            matched = self._filter_products(products, keyword)
            if matched:
                return matched[:bounded_limit]

        # 最後手段：拉較多筆後於後端篩選（避免一次 2 萬筆）
        fallback_limit = min(max(bounded_limit * 10, 50), 200)
        products = self._fetch_products(irwhere="", iwhval="", limit=fallback_limit)
        return self._filter_products(products, keyword)[:bounded_limit]

    def _filter_products(self, products: list[ErpProduct], keyword: str) -> list[ErpProduct]:
        needle = keyword.casefold()
        return [
            product
            for product in products
            if needle in product.sku_no.casefold() or needle in product.name.casefold()
        ]

    def _fetch_products(self, irwhere: str, iwhval: str, limit: int) -> list[ErpProduct]:
        pass_key = self._get_pass_key()
        body = build_operation_xml(
            "LyDataOut",
            self._config.target_ns,
            {
                "ikye": pass_key,
                "icpno": self._config.company_code,
                "idakd": self._config.data_kind,
                "ifld": PRODUCT_FIELDS,
                "idetfields": "",
                "irwhere": irwhere,
                "iwhval": iwhval,
                "irec": str(limit),
                "imode": LY_DATA_OUT_IMODE,
                "iorder": "",
            },
        )
        action = soap_action(
            self._config.target_ns,
            self._config.soap_interface,
            "LyDataOut",
        )
        response_xml = soap_post(
            self._config.soap_url,
            action,
            body,
            self._config.timeout,
        )
        parsed = parse_data_out(response_xml)
        status = parsed.get("LyDataOutResult") or parsed.get("lyDataOutResult")
        if status is not None and re.fullmatch(r"-?\d+", status) and int(status) < 0:
            raise LyErpError(f"LyDataOut 失敗，錯誤碼：{status}")

        payload = (
            parsed.get("ixmlda")
            or parsed.get("iXmlda")
            or parsed.get("IXMLDA")
            or ""
        )
        return parse_product_xml(payload)

    def _get_pass_key(self) -> str:
        now = time.time()
        if self._pass_key and now - self._pass_key_at < 25:
            return self._pass_key

        body = build_operation_xml(
            "LyGetPassKey",
            self._config.target_ns,
            {"pusid": self._config.user, "pverifykey": self._config.password},
        )
        action = soap_action(
            self._config.target_ns,
            self._config.soap_interface,
            "LyGetPassKey",
        )
        response_xml = soap_post(
            self._config.soap_url,
            action,
            body,
            self._config.timeout,
        )
        pass_key = parse_pass_key(response_xml)
        if pass_key is None:
            raise LyErpError("無法解析凌越金鑰回應")
        if re.fullmatch(r"-\d+", pass_key):
            raise LyErpError(f"取得凌越金鑰失敗，錯誤碼：{pass_key}")

        self._pass_key = pass_key
        self._pass_key_at = now
        return pass_key


def soap_post(url: str, action: str, body_inner: str, timeout: float) -> str:
    envelope = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="{SOAP_NS}">
  <soap:Body>
    {body_inner}
  </soap:Body>
</soap:Envelope>"""
    request = urllib.request.Request(
        url,
        data=envelope.encode("utf-8"),
        headers={
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": action,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise LyErpError(f"凌越 HTTP 錯誤 {exc.code}：{exc.reason} {detail}") from exc
    except urllib.error.URLError as exc:
        raise LyErpError(f"無法連線凌越 API：{exc.reason}") from exc


def soap_action(target_ns: str, interface: str, operation: str) -> str:
    ns = target_ns if target_ns.endswith("/") else f"{target_ns}/"
    return f'"{ns}{interface}/{operation}"'


def build_operation_xml(operation: str, target_ns: str, params: dict[str, str]) -> str:
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
    for name in ("LyGetPassKeyResult", "lyGetPassKeyResult", "GetPassKeyResult"):
        value = find_first_text(root, (name,))
        if value is not None:
            return value
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


def parse_product_xml(payload: str) -> list[ErpProduct]:
    if not payload.strip():
        return []

    wrapped = payload.strip()
    if not wrapped.startswith("<"):
        return []

    try:
        root = ET.fromstring(wrapped)
    except ET.ParseError:
        try:
            root = ET.fromstring(f"<root>{wrapped}</root>")
        except ET.ParseError:
            return []

    products: list[ErpProduct] = []
    for row in root.iter():
        if local_name(row.tag) != "LYDATATITLE":
            continue
        fields = {local_name(child.tag): (child.text or "").strip() for child in row}
        sku_no = fields.get("SK_NO", "")
        name = fields.get("SK_NAME", "")
        if not sku_no and not name:
            continue
        products.append(
            ErpProduct(
                sku_no=sku_no,
                name=name,
                spec=fields.get("SK_SPEC", ""),
                unit=fields.get("SK_UNIT", "") or "件",
            )
        )
    return products
