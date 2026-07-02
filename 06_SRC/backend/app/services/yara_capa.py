import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any


def scan_yara(content: bytes) -> dict[str, Any]:
    rules_path = os.getenv("SANSEC_YARA_RULES")
    if not rules_path:
        return {"enabled": False, "status": "not_configured", "matches": []}
    try:
        import yara
    except ImportError:
        return {"enabled": False, "status": "missing_dependency", "matches": []}

    try:
        rules = yara.compile(filepath=rules_path)
        matches = rules.match(data=content, timeout=int(os.getenv("SANSEC_YARA_TIMEOUT", "10")))
        return {
            "enabled": True,
            "status": "ok",
            "matches": [
                {"rule": match.rule, "namespace": match.namespace, "tags": list(match.tags), "meta": dict(match.meta)}
                for match in matches
            ],
        }
    except Exception as exc:
        return {"enabled": True, "status": "error", "detail": str(exc), "matches": []}


def run_capa(content: bytes) -> dict[str, Any]:
    import re
    import uuid
    import shutil
    from app.services.storage_manager import StorageManager
    
    storage_manager = StorageManager()
    capa_bin = os.getenv("SANSEC_CAPA_BIN")
    if capa_bin:
        timeout = int(os.getenv("SANSEC_CAPA_TIMEOUT", "30"))
        tmpdir = storage_manager.temp_dir / f"capa-{uuid.uuid4()}"
        tmpdir.mkdir(parents=True, exist_ok=True)
        sample_path = tmpdir / "sample.bin"
        try:
            sample_path.write_bytes(content)
            completed = subprocess.run(
                [capa_bin, "-j", str(sample_path)],
                check=False,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            if completed.returncode == 0:
                output = json.loads(completed.stdout)
                rules = output.get("rules", {})
                capabilities = sorted(rules.keys())[:100]
                return {"enabled": True, "status": "ok", "capabilities": capabilities, "raw": output}
        except Exception:
            pass
        finally:
            try:
                if sample_path.exists():
                    sample_path.unlink()
                if tmpdir.exists():
                    shutil.rmtree(tmpdir)
            except Exception:
                pass

    # Heuristic fallback scanner
    capabilities = []
    try:
        # Check standard APIs
        if content.startswith(b'MZ'):
            import pefile
            pe = pefile.PE(data=content)
            apis = []
            if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
                for entry in pe.DIRECTORY_ENTRY_IMPORT:
                    for imp in entry.imports:
                        if imp.name:
                            apis.append(imp.name.decode('utf-8', errors='ignore').lower())
            
            mapping = {
                "virtualalloc": "allocate memory",
                "writeprocessmemory": "write process memory",
                "createremotethread": "create remote thread",
                "isdebuggerpresent": "detect debugger",
                "checkremotedebuggerpresent": "detect debugger",
                "gettickcount": "reference anti-analysis timing",
                "internetopen": "link function Web request",
                "socket": "create TCP socket",
                "regsetvalue": "create registry persistence",
                "shellexecute": "execute shell command",
                "winexec": "execute shell command",
                "createprocess": "create process"
            }
            for api_sub, cap in mapping.items():
                if any(api_sub in api for api in apis):
                    capabilities.append(cap)
    except Exception:
        pass

    # Extract network indicator strings
    try:
        ascii_re = re.compile(rb'[\x20-\x7e]{4,}')
        for match in ascii_re.finditer(content[:50000]):
            s = match.group().decode('ascii', errors='ignore').lower()
            if "http://" in s or "https://" in s:
                capabilities.append("communicate over HTTP")
    except Exception:
        pass

    return {
        "enabled": True,
        "status": "ok",
        "capabilities": sorted(list(set(capabilities))),
    }

