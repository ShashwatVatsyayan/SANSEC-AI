import hashlib
import math
import re
import pefile

def calculate_hashes(data: bytes) -> dict:
    return {
        "md5": hashlib.md5(data, usedforsecurity=False).hexdigest(),
        "sha1": hashlib.sha1(data, usedforsecurity=False).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest()
    }

def calculate_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    entropy = 0
    for x in range(256):
        p_x = float(data.count(x)) / len(data)
        if p_x > 0:
            entropy += - p_x * math.log(p_x, 2)
    return round(entropy, 2)

def extract_strings(data: bytes, min_len: int = 4, max_strings: int = 150) -> list:
    ascii_re = re.compile(rb'[\x20-\x7e]{' + bytes(str(min_len), 'utf-8') + rb',}')
    unicode_re = re.compile(rb'(?:[\x20-\x7e]\x00){' + bytes(str(min_len), 'utf-8') + rb',}')
    
    strings = []
    # Extract ASCII
    for match in ascii_re.finditer(data):
        try:
            strings.append(match.group().decode('ascii'))
        except Exception:
            pass
        if len(strings) >= max_strings:
            break
            
    # Extract Unicode
    if len(strings) < max_strings:
        for match in unicode_re.finditer(data):
            try:
                strings.append(match.group().replace(b'\x00', b'').decode('ascii'))
            except Exception:
                pass
            if len(strings) >= max_strings:
                break
                
    return strings[:max_strings]

def detect_file_type(data: bytes, filename: str) -> str:
    if data.startswith(b'MZ'):
        if len(data) < 0x100:
            return "PE Executable (Corrupted or Invalid)"
        # Check if DLL or EXE in headers
        try:
            pe = pefile.PE(data=data, fast_load=True)
            if pe.is_dll():
                return "DLL (Windows Dynamic Link Library)"
            return "EXE (Windows Portable Executable)"
        except Exception:
            return "PE Executable (Corrupted or Invalid)"
    elif data.startswith(b'%PDF'):
        return "PDF Document"
    elif data.startswith(b'PK\x03\x04'):
        # Could be ZIP, APK, Office Doc (docx, xlsx, pptx)
        if filename.endswith('.apk'):
            return "APK (Android Package)"
        elif filename.endswith(('.docx', '.xlsx', '.pptx')):
            return "Office Open XML Document"
        return "ZIP Archive"
    elif data.startswith(b'\x7fELF'):
        return "ELF (Linux Executable/Shared Library)"
    
    # Text fallback
    try:
        data[:1024].decode('utf-8')
        return "Text / Script File"
    except UnicodeDecodeError:
        return "Generic Binary"

def analyze_pe(data: bytes) -> dict:
    try:
        if len(data) < 0x100:
            return {
                "is_pe": False,
                "error": "Failed to parse PE: file is too small to contain a valid PE header"
            }
        pe = pefile.PE(data=data)
        
        # Machine type
        machine = pe.FILE_HEADER.Machine
        machine_str = "Unknown"
        if machine == 0x014c:
            machine_str = "x86 (32-bit)"
        elif machine == 0x8664:
            machine_str = "x64 (64-bit)"
        elif machine == 0xaa64:
            machine_str = "ARM64"
            
        # Entry point
        entry_point = hex(pe.OPTIONAL_HEADER.AddressOfEntryPoint)
        
        # Sections
        sections = []
        suspicious_sections = []
        high_entropy_sections = []
        
        for section in pe.sections:
            name = section.Name.decode('utf-8', errors='ignore').strip('\x00')
            entropy = section.get_entropy()
            vsize = section.Misc_VirtualSize
            rsize = section.SizeOfRawData
            
            # Check characteristics
            is_writable = bool(section.Characteristics & 0x80000000)
            is_executable = bool(section.Characteristics & 0x20000000)
            is_readable = bool(section.Characteristics & 0x40000000)
            
            sec_info = {
                "name": name,
                "virtual_size": vsize,
                "raw_size": rsize,
                "entropy": round(entropy, 2),
                "writable": is_writable,
                "executable": is_executable,
                "readable": is_readable
            }
            sections.append(sec_info)
            
            # Writable + Executable is highly suspicious (often indicates packing/shellcode)
            if is_writable and is_executable:
                suspicious_sections.append(f"{name} is both Writable and Executable")
            
            # Unusually high entropy (> 7.2) indicates packing/encryption
            if entropy > 7.2:
                high_entropy_sections.append(f"{name} has high entropy ({round(entropy, 2)})")
                
            # Virtual size much larger than raw size indicates uninitialized data (packing)
            if vsize > rsize * 3 and rsize > 0:
                suspicious_sections.append(f"{name} virtual size ({vsize}) is much larger than raw size ({rsize})")

        # Imports
        imports = {}
        suspicious_apis = []
        
        # Common suspicious APIs
        suspicious_patterns = {
            "Process Injection": ["VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread", "QueueUserAPC", "NtCreateSection", "MapViewOfSection"],
            "Evasion/Anti-Debug": ["IsDebuggerPresent", "CheckRemoteDebuggerPresent", "OutputDebugString", "FindWindow", "GetTickCount"],
            "Network / C2": ["InternetOpen", "InternetConnect", "HttpOpenRequest", "HttpSendRequest", "URLDownloadToFile", "Socket", "WSAStartup"],
            "Execution": ["ShellExecute", "WinExec", "CreateProcess", "System"],
            "Persistence/Registry": ["RegSetValueEx", "RegCreateKeyEx", "SetWindowsHookEx"],
            "Keylogging": ["GetAsyncKeyState", "GetKeyState", "SetWindowsHookEx"]
        }

        if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
            for entry in pe.DIRECTORY_ENTRY_IMPORT:
                dll_name = entry.dll.decode('utf-8', errors='ignore')
                funcs = []
                for imp in entry.imports:
                    if imp.name:
                        func_name = imp.name.decode('utf-8', errors='ignore')
                        funcs.append(func_name)
                        
                        # Match suspicious APIs
                        for category, apis in suspicious_patterns.items():
                            for api in apis:
                                if api.lower() in func_name.lower():
                                    suspicious_apis.append({
                                        "api": func_name,
                                        "category": category,
                                        "dll": dll_name
                                    })
                imports[dll_name] = funcs
                
        # Exports
        exports = []
        if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT'):
            for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
                if exp.name:
                    exports.append(exp.name.decode('utf-8', errors='ignore'))
                    
        # Resources
        resources = []
        if hasattr(pe, 'DIRECTORY_ENTRY_RESOURCE'):
            for resource_type in pe.DIRECTORY_ENTRY_RESOURCE.entries:
                res_type_name = ""
                if resource_type.name is not None:
                    res_type_name = resource_type.name.decode('utf-8', errors='ignore')
                else:
                    res_type_name = str(resource_type.id)
                
                if hasattr(resource_type, 'directory'):
                    for resource_id in resource_type.directory.entries:
                        res_name = ""
                        if resource_id.name is not None:
                            res_name = resource_id.name.decode('utf-8', errors='ignore')
                        else:
                            res_name = str(resource_id.id)
                        
                        if hasattr(resource_id, 'directory'):
                            for resource_lang in resource_id.directory.entries:
                                struct = getattr(resource_lang.data, 'struct', None)
                                if struct:
                                    size_val = getattr(struct, 'Size', 0)
                                    offset = getattr(struct, 'OffsetToData', 0)
                                else:
                                    size_val = 0
                                    offset = 0
                                resources.append({
                                    "type": res_type_name,
                                    "name": res_name,
                                    "size": size_val,
                                    "offset": offset
                                })
                                
        return {
            "is_pe": True,
            "machine": machine_str,
            "entry_point": entry_point,
            "sections": sections,
            "imports": imports,
            "exports": exports,
            "resources": resources,
            "suspicious_sections": suspicious_sections,
            "high_entropy_sections": high_entropy_sections,
            "suspicious_apis": suspicious_apis
        }
    except Exception as e:
        return {
            "is_pe": False,
            "error": f"Failed to parse PE: {str(e)}"
        }

def find_iocs(strings: list) -> dict:
    ip_pattern = re.compile(r'\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b')
    url_pattern = re.compile(r'https?://[^\s/$.?#].[^\s]*', re.IGNORECASE)
    email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    domain_pattern = re.compile(r'\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b', re.IGNORECASE)
    
    ips = set()
    urls = set()
    emails = set()
    domains = set()
    
    # Excluded common domains/extensions to reduce noise
    excluded_domains = {'microsoft.com', 'windows.com', 'xmlpull.org', 'w3.org'}
    excluded_extensions = {'dll', 'exe', 'sys', 'pdb', 'manifest', 'lnk', 'ocx'}
    
    for s in strings:
        # Find IPs
        for ip in ip_pattern.findall(s):
            # Basic validation
            parts = ip.split('.')
            if all(0 <= int(p) <= 255 for p in parts) and ip != '0.0.0.0' and ip != '127.0.0.1':
                ips.add(ip)
                
        # Find URLs
        for url in url_pattern.findall(s):
            # Clean up URLs (remove trailing garbage)
            cleaned_url = url.split('"')[0].split("'")[0].split(')')[0].split('>')[0]
            if len(cleaned_url) > 8:
                urls.add(cleaned_url)
                
        # Find Emails
        for email in email_pattern.findall(s):
            emails.add(email)
            
        # Find Domains
        for domain in domain_pattern.findall(s):
            dom_lower = domain.lower()
            if dom_lower not in excluded_domains and not any(dom_lower.endswith('.' + ext) for ext in excluded_extensions):
                # Don't add if it looks like a filename (contains no other dots)
                if '.' in dom_lower and len(dom_lower.split('.')) > 1:
                    domains.add(domain)

    return {
        "ips": sorted(ips),
        "urls": sorted(urls),
        "emails": sorted(emails),
        "domains": sorted(domains)[:30] # Limit domains output
    }

def match_signatures(file_type: str, pe_info: dict, iocs: dict, entropy: float) -> list:
    signatures = []
    
    if pe_info.get("is_pe"):
        # Section checks
        if pe_info.get("suspicious_sections"):
            signatures.append({
                "name": "Suspicious PE Section Characteristics",
                "severity": "High",
                "description": "The file contains PE sections that are writable and executable, or virtual sizes that deviate heavily from raw sizes. Typical of packers or injection modules."
            })
        if pe_info.get("high_entropy_sections"):
            signatures.append({
                "name": "Compressed or Packed Sections",
                "severity": "Medium",
                "description": "High section entropy (> 7.2) detected, indicating the section content is packed, obfuscated, or encrypted."
            })
            
        # API checks
        susp_apis = pe_info.get("suspicious_apis", [])
        if susp_apis:
            categories = set(api["category"] for api in susp_apis)
            signatures.append({
                "name": f"Suspicious API Import Profile ({', '.join(categories)})",
                "severity": "High" if "Process Injection" in categories or "Keylogging" in categories else "Medium",
                "description": f"The file imports APIs associated with key malware techniques: {', '.join(set(api['api'] for api in susp_apis[:8]))}."
            })
            
    # IOC checks
    if iocs.get("ips"):
        signatures.append({
            "name": "Embedded IP Addresses",
            "severity": "Medium",
            "description": f"Found embedded IPv4 addresses: {', '.join(iocs['ips'][:5])}."
        })
    if iocs.get("urls"):
        signatures.append({
            "name": "Embedded URL Indicators",
            "severity": "Medium",
            "description": f"Found references to external network endpoints: {', '.join(iocs['urls'][:3])}."
        })
        
    # High overall entropy
    if entropy > 7.0 and "Packed" not in [s["name"] for s in signatures]:
        signatures.append({
            "name": "High Overall File Entropy",
            "severity": "Medium",
            "description": f"Overall Shannon entropy is very high ({entropy}), indicating strong possibility of encryption, packing, or compressed payloads."
        })
        
    return signatures

def calculate_risk_score(file_type: str, pe_info: dict, signatures: list, entropy: float) -> int:
    score = 10  # Baseline score
    
    # File type risk weights
    if "EXE" in file_type or "DLL" in file_type:
        score += 15
    elif "APK" in file_type:
        score += 10
    elif "PDF" in file_type or "Office" in file_type:
        score += 5
        
    # High entropy
    if entropy > 7.0:
        score += 15
    elif entropy > 6.0:
        score += 5
        
    # Signature penalties
    for sig in signatures:
        if sig["severity"] == "High":
            score += 25
        elif sig["severity"] == "Medium":
            score += 10
        elif sig["severity"] == "Low":
            score += 5
            
    # Cap at 100 and floor at 0
    return min(max(score, 0), 100)
