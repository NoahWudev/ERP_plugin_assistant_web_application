from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_ENV_FILE = ROOT_DIR / ".env"

SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
DEFAULT_TARGET_NS = "http://tempuri.org/"
DEFAULT_SOAP_INTERFACE = "IErpService"
PRODUCT_DATA_KIND = "000000"
PRODUCT_FIELDS = "SK_NO,SK_NAME,SK_UNIT,SK_SPEC"
# LyDataOut imode：30 位；第 2 碼為 1，其餘為 0
LY_DATA_OUT_IMODE = "0" + "1" + "0" * 28


def load_env_file(path: Path = DEFAULT_ENV_FILE) -> None:
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


@dataclass(frozen=True)
class LyErpConfig:
    soap_url: str
    company_code: str
    user: str
    password: str
    data_kind: str = PRODUCT_DATA_KIND
    target_ns: str = DEFAULT_TARGET_NS
    soap_interface: str = DEFAULT_SOAP_INTERFACE
    timeout: float = 30.0

    @classmethod
    def from_env(cls) -> LyErpConfig:
        load_env_file()
        missing = [
            name
            for name, value in (
                ("LY_ERP_SOAP_URL", os.environ.get("LY_ERP_SOAP_URL", "").strip()),
                ("LY_ERP_COMPANY_CODE", os.environ.get("LY_ERP_COMPANY_CODE", "").strip()),
                ("LY_ERP_USER", os.environ.get("LY_ERP_USER", "").strip()),
                ("LY_ERP_PASSWORD", os.environ.get("LY_ERP_PASSWORD", "").strip()),
            )
            if not value
        ]
        if missing:
            joined = ", ".join(missing)
            raise ValueError(f"缺少凌越 ERP 環境變數：{joined}")

        timeout_raw = os.environ.get("LY_ERP_TIMEOUT", "30").strip()
        return cls(
            soap_url=os.environ["LY_ERP_SOAP_URL"].strip(),
            company_code=os.environ["LY_ERP_COMPANY_CODE"].strip(),
            user=os.environ["LY_ERP_USER"].strip(),
            password=os.environ["LY_ERP_PASSWORD"].strip(),
            data_kind=os.environ.get("LY_ERP_DATA_KIND", PRODUCT_DATA_KIND).strip(),
            target_ns=os.environ.get("LY_ERP_TARGET_NS", DEFAULT_TARGET_NS).strip(),
            soap_interface=os.environ.get("LY_ERP_SOAP_INTERFACE", DEFAULT_SOAP_INTERFACE).strip(),
            timeout=float(timeout_raw or "30"),
        )
