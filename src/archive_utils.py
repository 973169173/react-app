"""Utility functions for handling compressed archives (currently ZIP).

Separated from app.py so that archive processing logic is isolated and easy
to maintain / merge. Only standard library modules are used. If later we
need to support tar(.gz) etc., we can extend this module without touching
the main Flask application file.

Returned file metadata schema follows the existing upload endpoint contract:
  {
    'id': int,
    'name': str,          # base filename
    'filename': str,      # same as name
    'folder': str,        # provided folder name or 'root'
    'content': str|None,  # text content for .txt, else None
    'size': int,          # bytes
    'type': str,          # mimetype guess
    'uploadTime': str,    # timestamp
    'extractedFrom': str, # original archive filename
    'relativePath': str   # path inside the archive
  }
"""
from __future__ import annotations

import io
import os
import time
import zipfile
from typing import Iterable, List, Dict, Set, Tuple
from werkzeug.utils import secure_filename


class ArchiveExtractionError(Exception):
    pass


def _is_within_directory(base: str, target: str) -> bool:
    """Prevent Zip Slip: ensure target remains inside base directory."""
    base_abs = os.path.abspath(base) + os.sep
    target_abs = os.path.abspath(target)
    return target_abs.startswith(base_abs)


def _safe_extract_member(zf: zipfile.ZipFile, member: zipfile.ZipInfo, base_dir: str) -> str:
    """Return a safe output path for member and ensure directories exist."""
    # Sanitize filename (remove leading /, drive letters)
    member_name = member.filename.lstrip('/').replace('..', '')
    # zipfile can contain directory entries ending with /
    if member_name.endswith('/'):
        out_dir = os.path.join(base_dir, member_name)
        if not _is_within_directory(base_dir, out_dir):
            raise ArchiveExtractionError(f"Unsafe directory path detected: {member.filename}")
        os.makedirs(out_dir, exist_ok=True)
        return out_dir
    # Build final path
    out_path = os.path.join(base_dir, member_name)
    if not _is_within_directory(base_dir, out_path):
        raise ArchiveExtractionError(f"Unsafe file path detected: {member.filename}")
    # Ensure parent directory exists
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    return out_path


def extract_zip_archive(
    file_storage,
    upload_dir: str,
    folder_name: str,
    allowed_inner_ext: Iterable[str] = ("txt", "pdf"),
    max_total_size: int = 50 * 1024 * 1024,  # 50MB aggregated extracted size safeguard
    max_members: int = 5000,
) -> Tuple[List[Dict], Dict]:
    """Extract a ZIP archive from an incoming FileStorage object.

    Parameters
    ----------
    file_storage : werkzeug.datastructures.FileStorage
        The uploaded file object (its stream will be read fully in-memory).
    upload_dir : str
        The base directory where files should be extracted.
    folder_name : str
        Logical folder grouping name used by the UI (root or user provided).
    allowed_inner_ext : Iterable[str]
        Allowed file extensions to materialize (without dot, lowercase).
    max_total_size : int
        Hard limit for accumulated extracted file sizes (to avoid zip bombs).
    max_members : int
        Maximum number of archive members processed.

    Returns
    -------
    (files, stats) : (List[Dict], Dict)
        files: list of file metadata dictionaries.
        stats: summary counts {extracted, skipped_extension, skipped_directory, skipped_other}.
    """
    archive_filename = secure_filename(file_storage.filename)
    raw = file_storage.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile as e:
        raise ArchiveExtractionError(f"Invalid ZIP archive: {e}")

    members = zf.infolist()
    if len(members) > max_members:
        raise ArchiveExtractionError(
            f"ZIP has {len(members)} members exceeding limit {max_members}."
        )

    allowed_inner_ext_set: Set[str] = {e.lower() for e in allowed_inner_ext}
    extracted_files: List[Dict] = []
    total_size = 0
    stats = {
        "extracted": 0,
        "skipped_extension": 0,
        "skipped_directory": 0,
        "skipped_other": 0,
    }

    timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())

    for member in members:
        # Skip directories explicitly
        if member.is_dir() or member.filename.endswith('/'):
            stats["skipped_directory"] += 1
            continue

        # Basic zip bomb mitigation: compressed vs uncompressed ratio check
        if member.compress_size and member.file_size / max(member.compress_size, 1) > 500:
            stats["skipped_other"] += 1
            continue

        ext = member.filename.rsplit('.', 1)[-1].lower() if '.' in member.filename else ''
        if ext not in allowed_inner_ext_set:
            stats["skipped_extension"] += 1
            continue

        if total_size + member.file_size > max_total_size:
            # Stop early if size cap would be exceeded
            break

        try:
            out_path = _safe_extract_member(zf, member, upload_dir)
            # Extract file content
            with zf.open(member, 'r') as src, open(out_path, 'wb') as dst:
                dst.write(src.read())
        except ArchiveExtractionError:
            stats["skipped_other"] += 1
            continue
        except Exception:
            stats["skipped_other"] += 1
            continue

        total_size += member.file_size
        # Prepare text content if .txt
        content = None
        if ext == 'txt':
            try:
                with open(out_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                try:
                    with open(out_path, 'r', encoding='gbk') as f:
                        content = f.read()
                except Exception:
                    content = None

        base_name = os.path.basename(member.filename)
        # id uses folder_name + relative path for stability
        file_id = abs(hash(f"{folder_name}_{member.filename}"))

        extracted_files.append({
            'id': file_id,
            'name': base_name,
            'filename': base_name,
            'folder': folder_name or 'root',
            'content': content,
            'size': member.file_size,
            'type': 'application/pdf' if ext == 'pdf' else 'text/plain',
            'uploadTime': timestamp,
            'extractedFrom': archive_filename,
            'relativePath': member.filename,
        })

        stats["extracted"] += 1

    return extracted_files, stats


__all__ = [
    'extract_zip_archive',
    'ArchiveExtractionError',
]
