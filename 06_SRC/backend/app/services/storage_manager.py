import logging
import os
import shutil
from pathlib import Path
from typing import Union

logger = logging.getLogger("sansec.storage_manager")


class StorageManager:
    def __init__(self) -> None:
        # Load variables from environment, with sensible fallbacks.
        # We resolve paths relative to the backend root (parent of app directory).
        backend_root = Path(__file__).resolve().parent.parent.parent
        
        self.storage_root = self._resolve_path(os.getenv("STORAGE_ROOT", "storage"), backend_root)
        self.upload_dir = self._resolve_path(os.getenv("UPLOAD_DIRECTORY", "storage/uploads"), backend_root)
        self.quarantine_dir = self._resolve_path(os.getenv("QUARANTINE_DIRECTORY", "storage/quarantine"), backend_root)
        self.report_dir = self._resolve_path(os.getenv("REPORT_DIRECTORY", "storage/reports"), backend_root)
        self.temp_dir = self._resolve_path(os.getenv("TEMP_DIRECTORY", "storage/temp"), backend_root)
        self.export_dir = self._resolve_path(os.getenv("EXPORT_DIRECTORY", "storage/exports"), backend_root)
        self.log_dir = self._resolve_path(os.getenv("LOG_DIRECTORY", "storage/logs"), backend_root)
        
        try:
            self.max_upload_size_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
        except ValueError:
            self.max_upload_size_mb = 100
            
        self.initialize_directories()

    def _resolve_path(self, path_str: str, base_path: Path) -> Path:
        path = Path(path_str)
        if not path.is_absolute():
            return (base_path / path).resolve()
        return path.resolve()

    def initialize_directories(self) -> None:
        """Create all storage directories on startup if they do not exist."""
        directories = [
            self.storage_root,
            self.upload_dir,
            self.quarantine_dir,
            self.report_dir,
            self.temp_dir,
            self.export_dir,
            self.log_dir
        ]
        for directory in directories:
            try:
                directory.mkdir(parents=True, exist_ok=True)
                logger.info("Directory verified/created: %s", directory)
            except Exception as e:
                logger.error("Failed to create directory %s: %s", directory, e)
                raise RuntimeError(f"Storage initialization failed for {directory}: {e}") from e

    def is_safe_path(self, path: Union[str, Path]) -> bool:
        """Validate path to prevent directory traversal attacks."""
        try:
            resolved_path = Path(path).resolve()
            # It must be within the storage root
            return self.storage_root in resolved_path.parents or resolved_path == self.storage_root
        except Exception:
            return False

    def validate_path(self, path: Union[str, Path]) -> Path:
        """Validate path and raise ValueError if traversal is detected."""
        resolved = Path(path).resolve()
        if not self.is_safe_path(resolved):
            logger.error("Directory traversal attempt detected: %s", path)
            raise ValueError(f"Access denied to path outside storage root: {path}")
        return resolved

    def save_file(self, content: bytes, filename: str, destination_dir: Path) -> Path:
        """Save raw content to a destination directory."""
        self.validate_path(destination_dir)
        safe_filename = Path(filename).name
        target_path = destination_dir / safe_filename
        self.validate_path(target_path)
        
        try:
            target_path.write_bytes(content)
            logger.info("Saved file to %s", target_path)
            return target_path
        except Exception as e:
            logger.error("Failed to save file %s to %s: %s", safe_filename, destination_dir, e)
            raise IOError(f"Could not save file: {e}") from e

    def save_upload(self, content: bytes, filename: str) -> Path:
        """Save an uploaded file to the uploads directory."""
        size_mb = len(content) / (1024 * 1024)
        if size_mb > self.max_upload_size_mb:
            raise ValueError(f"File size ({size_mb:.2f} MB) exceeds maximum allowed size ({self.max_upload_size_mb} MB)")
        return self.save_file(content, filename, self.upload_dir)

    def quarantine_file(self, file_path: Union[str, Path]) -> Path:
        """Move a suspicious file to the quarantine directory."""
        src_path = self.validate_path(file_path)
        if not src_path.exists():
            raise FileNotFoundError(f"Source file not found for quarantine: {src_path}")
            
        dest_path = self.quarantine_dir / src_path.name
        self.validate_path(dest_path)
        
        try:
            shutil.move(str(src_path), str(dest_path))
            logger.warning("Quarantined suspicious file: %s -> %s", src_path, dest_path)
            return dest_path
        except Exception as e:
            logger.error("Failed to quarantine file %s: %s", src_path, e)
            raise IOError(f"Quarantine operation failed: {e}") from e

    def save_report(self, content: Union[str, bytes], filename: str) -> Path:
        """Save a generated report."""
        safe_filename = Path(filename).name
        target_path = self.report_dir / safe_filename
        self.validate_path(target_path)
        
        try:
            if isinstance(content, bytes):
                target_path.write_bytes(content)
            else:
                target_path.write_text(content, encoding="utf-8")
            logger.info("Saved report to %s", target_path)
            return target_path
        except Exception as e:
            logger.error("Failed to save report %s: %s", safe_filename, e)
            raise IOError(f"Could not save report: {e}") from e

    def save_export(self, content: Union[str, bytes], filename: str) -> Path:
        """Save a generated export file."""
        safe_filename = Path(filename).name
        target_path = self.export_dir / safe_filename
        self.validate_path(target_path)
        
        try:
            if isinstance(content, bytes):
                target_path.write_bytes(content)
            else:
                target_path.write_text(content, encoding="utf-8")
            logger.info("Saved export to %s", target_path)
            return target_path
        except Exception as e:
            logger.error("Failed to save export %s: %s", safe_filename, e)
            raise IOError(f"Could not save export: {e}") from e

    def clean_temp(self) -> None:
        """Clean all files in the temporary directory."""
        logger.info("Cleaning temporary storage directory...")
        for item in self.temp_dir.iterdir():
            try:
                self.validate_path(item)
                if item.is_file() or item.is_symlink():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
                logger.debug("Removed temp item: %s", item)
            except Exception as e:
                logger.error("Failed to delete temp item %s: %s", item, e)
