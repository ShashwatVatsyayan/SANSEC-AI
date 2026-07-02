import os
import httpx
import logging
from typing import Dict, Any, List
from pydantic_settings import BaseSettings

# Setup logging
logger = logging.getLogger("sansec.ai_service")
logging.basicConfig(level=logging.INFO)

class AIServiceSettings(BaseSettings):
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    api_timeout_seconds: float = 30.0

    class Config:
        env_file = ".env"
        extra = "ignore"

class GeminiServiceClient:
    def __init__(self):
        self.settings = AIServiceSettings()
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        
    @property
    def is_configured(self) -> bool:
        return bool(self.settings.gemini_api_key)

    async def _generate_content(self, system_instruction: str, prompt: str) -> str:
        """Helper to invoke Gemini generateContent REST endpoint using HTTPX."""
        if not self.is_configured:
            logger.warning("Gemini API key is missing. Using static simulation fallback.")
            raise ValueError("GEMINI_API_KEY is not configured.")

        url = f"{self.base_url}/{self.settings.gemini_model}:generateContent?key={self.settings.gemini_api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [
                    {"text": system_instruction}
                ]
            },
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.95,
                "maxOutputTokens": 2048
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=payload,
                    timeout=self.settings.api_timeout_seconds
                )
                
                if response.status_code == 429:
                    logger.error("Gemini API rate limit exceeded (HTTP 429).")
                    raise Exception("Gemini API Rate Limit Exceeded.")
                    
                response.raise_for_status()
                result = response.json()
                
                # Extract text response from Gemini response payload
                candidates = result.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
                
                raise Exception("Empty response candidate returned from Gemini API.")
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Gemini API returned status code {e.response.status_code}: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Error communicating with Gemini API: {str(e)}")
                raise

    async def explain_malware_report(self, report: Dict[str, Any]) -> str:
        """
        Generates a comprehensive explainable report combining:
        - Executive summary
        - Risk assessment
        - Behavior explanation
        - IOC explanation
        - MITRE ATT&CK explanation
        - Recommended remediation
        """
        system_instruction = (
            "You are SANSEC AI, an expert malware reverse engineer and incident responder. "
            "Your task is to analyze static file telemetry and write a professional, structured markdown report. "
            "Do not output HTML. Follow technical markdown format strictly. Be objective, concise, and thorough."
        )

        prompt = f"""
        Analyze the following static analysis telemetry details and compile a detailed markdown assessment:
        
        Filename: {report.get('filename')}
        File Type: {report.get('file_type')}
        File Size: {report.get('size')} bytes
        Entropy: {report.get('entropy')}
        Risk Score: {report.get('risk_score')}/100
        Threat Level: {report.get('threat_level')}
        
        Heuristic Signatures:
        {report.get('signatures', [])}
        
        PE Info Structure:
        {report.get('pe_info', {})}
        
        Indicators of Compromise (IOCs):
        {report.get('iocs', {})}
        
        MITRE Mappings:
        {report.get('mitre_mappings', [])}
        
        Include the following sections in your markdown output:
        ### 🛡️ SANSEC AI Executive Assessment Summary
        (Write a high-level summary of the file nature, risks, and execution warnings.)
        
        ### 📊 Key Technical Findings
        - Explain entropy (packed/obfuscated vs clean).
        - Detail suspicious imports (process injection, evasion, keylogging).
        - Note section header anomalies.
        
        ### 🌐 Threat Intelligence Indicators (IOCs)
        (Summarize domains, URLs, and IPs found. Detail potential risk of leaving them unblocked.)
        
        ### 🎯 MITRE ATT&CK Matrix Mapping
        (Explain the mapped techniques, why they are used, and the tactical impact.)
        
        ### 🛠️ Defense & Mitigation Strategy
        (List actionable steps for isolation, detection, network blocks, and remediation.)
        """

        try:
            return await self._generate_content(system_instruction, prompt)
        except Exception as e:
            logger.error(f"Failed to generate explainable report, using fallback. Error: {str(e)}")
            return self._get_fallback_explanation(report)

    async def chat_assistant(self, report: Dict[str, Any], history: List[Dict[str, str]], message: str) -> str:
        """
        Maintains an interactive conversation session regarding a scanned file report context.
        """
        system_instruction = (
            f"You are SANSEC AI, an expert security assistant. You are reviewing the file analysis report of '{report.get('filename')}' "
            f"with a threat score of {report.get('risk_score')}/100 ({report.get('threat_level')}). "
            "Answer questions objectively based on the report data. Keep responses helpful and under 150 words."
        )

        # Build message history context for Gemini
        history_context = []
        for msg in history[-8:]:  # limit to last 8 messages to stay in context limits
            role = "user" if msg.get("sender") == "user" else "model"
            history_context.append(f"{role.upper()}: {msg.get('text')}")
            
        history_str = "\n".join(history_context)
        
        prompt = f"""
        File Telemetry Context:
        Hashes: {report.get('hashes')}
        Heuristic Signatures: {report.get('signatures')}
        Suspicious Imports: {report.get('pe_info', {}).get('suspicious_apis', [])}
        IOCs: {report.get('iocs')}
        MITRE Mappings: {report.get('mitre_mappings')}
        
        Conversation History:
        {history_str}
        
        USER: {message}
        MODEL:
        """

        try:
            return await self._generate_content(system_instruction, prompt)
        except Exception as e:
            logger.error(f"Failed to generate chat response, using fallback. Error: {str(e)}")
            return f"Understood. Regarding '{report.get('filename')}', the request relates to its heuristic flags. Please verify details in the overview tabs."

    def _get_fallback_explanation(self, report: Dict[str, Any]) -> str:
        """Returns a formatted markdown explanation in case of API failure."""
        risk = report.get("risk_score", 0)
        level = report.get("threat_level", "Low")
        filename = report.get("filename", "unknown")
        
        return f"""### 🛡️ SANSEC AI Executive Assessment Summary
The sample **{filename}** exhibits characteristics of a **{level}** threat profile with a calculated threat score of **{risk}/100**.

### 📊 Key Technical Findings
- **File Structure**: Entropy of {report.get('entropy')} was computed.
- **Section Details**: PE analysis resolved {len(report.get('pe_info', {}).get('sections', []))} sections.

### 🌐 Threat Intelligence Indicators (IOCs)
- No external lookup feeds were successfully queried during fallback mode.

### 🎯 MITRE ATT&CK Matrix Mapping
{'- Mapped techniques: ' + ', '.join([m.get('id') for m in report.get('mitre_mappings', [])]) if report.get('mitre_mappings') else '- No active MITRE signatures resolved.'}

### 🛠️ Defense & Mitigation Strategy
1. **Isolate Sandbox Testing**: Run dynamic analysis of the executable inside a containerized sandbox.
2. **System Log Monitoring**: Monitor active logs on local workstations."""
