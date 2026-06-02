//! Validation + normalization for run-relative asset/evidence paths.
//!
//! Every CLI/HTTP write that records a path on state.json or a reply runs the
//! string through `validate_relative` first, then stores the `normalize`d form.
//! The two together enforce the contract documented in `docs/trace/CLI.md`:
//!
//! - POSIX `/` separators only (no `\`)
//! - run-relative (no leading `/`, no `..` traversal)
//! - no Windows-reserved basenames (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
//! - canonical Unicode (NFC), so `café` and `café` collapse to one path

use unicode_normalization::{is_nfc, UnicodeNormalization};

/// Validate a run-relative path. Returns the first reason it's not acceptable,
/// or `Ok(())` if it can be stored as-is (after normalize).
pub fn validate_relative(p: &str) -> Result<(), &'static str> {
    if p.is_empty() {
        return Err("path is empty");
    }
    if p.starts_with('/') {
        return Err("path must be relative (no leading '/')");
    }
    if p.contains('\\') {
        return Err("path must use POSIX '/' separators (no backslash)");
    }
    if p.contains('\0') {
        return Err("path contains a null byte");
    }
    for segment in p.split('/') {
        if segment.is_empty() {
            return Err("path has an empty segment ('//' or trailing '/')");
        }
        if segment == ".." {
            return Err("path traversal ('..') is not allowed");
        }
        if segment == "." {
            return Err("'.' segments are not allowed");
        }
        if is_windows_reserved(segment) {
            return Err("path uses a Windows-reserved name (CON/PRN/AUX/NUL/COM*/LPT*)");
        }
        if segment.ends_with(' ') || segment.ends_with('.') {
            return Err("path segment must not end with space or '.'");
        }
        for c in segment.chars() {
            // Forbid the other Windows-illegal printables. `/` is the
            // separator and already filtered by split().
            if matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') {
                return Err("path contains a reserved character (< > : \" | ? *)");
            }
            if (c as u32) < 0x20 {
                return Err("path contains a control character");
            }
        }
    }
    Ok(())
}

/// Apply NFC normalization. Caller has already run `validate_relative`, which
/// rejects `//` so no slash-collapsing is needed.
pub fn normalize(p: &str) -> String {
    if is_nfc(p) {
        return p.to_string();
    }
    p.nfc().collect()
}

/// Combine validation + normalization into the single call used at write sites.
pub fn check_and_normalize(p: &str) -> Result<String, &'static str> {
    validate_relative(p)?;
    Ok(normalize(p))
}

/// Apply `check_and_normalize` to a slice, surfacing the offending value
/// together with its reason so the caller can build an appropriate error type.
pub fn check_and_normalize_all<'a, I: IntoIterator<Item = &'a str>>(
    paths: I,
) -> Result<Vec<String>, (String, &'static str)> {
    paths
        .into_iter()
        .map(|p| check_and_normalize(p).map_err(|e| (p.to_string(), e)))
        .collect()
}

fn is_windows_reserved(seg: &str) -> bool {
    // Reserved names match case-insensitively, with or without an extension.
    let stem = match seg.find('.') {
        Some(i) => &seg[..i],
        None => seg,
    };
    let upper = stem.to_ascii_uppercase();
    matches!(
        upper.as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_simple_run_relative() {
        assert!(validate_relative("a/b/c.png").is_ok());
        assert!(validate_relative("file.txt").is_ok());
        assert!(validate_relative("analyze_dream/jung-shadow.png").is_ok());
    }

    #[test]
    fn rejects_traversal() {
        assert!(validate_relative("../escape.txt").is_err());
        assert!(validate_relative("a/../b").is_err());
    }

    #[test]
    fn rejects_absolute() {
        assert!(validate_relative("/abs/path.txt").is_err());
    }

    #[test]
    fn rejects_backslash() {
        assert!(validate_relative("a\\b").is_err());
        assert!(validate_relative("subdir\\file.txt").is_err());
    }

    #[test]
    fn rejects_windows_reserved() {
        assert!(validate_relative("CON").is_err());
        assert!(validate_relative("con.txt").is_err());
        assert!(validate_relative("dir/NUL.png").is_err());
        assert!(validate_relative("COM3.log").is_err());
        // But not CONFIG (stem is CONFIG, not CON)
        assert!(validate_relative("config.json").is_ok());
    }

    #[test]
    fn rejects_reserved_characters() {
        for s in &["a:b", "a|b", "a?b", "a*b", "a<b", "a>b", "a\"b"] {
            assert!(validate_relative(s).is_err(), "should reject {}", s);
        }
    }

    #[test]
    fn rejects_empty_or_double_slash() {
        assert!(validate_relative("").is_err());
        assert!(validate_relative("a//b").is_err());
        assert!(validate_relative("a/").is_err());
    }

    #[test]
    fn rejects_trailing_space_or_dot() {
        assert!(validate_relative("file. ").is_err());
        assert!(validate_relative("trailing./next").is_err());
    }

    #[test]
    fn normalize_idempotent_on_valid_input() {
        assert_eq!(normalize("a/b/c"), "a/b/c");
        assert_eq!(normalize("file.png"), "file.png");
    }

    #[test]
    fn normalize_yields_nfc() {
        // U+0301 (combining acute) → composed é (U+00E9)
        let decomposed = "cafe\u{0301}.png";
        let composed = "café.png";
        assert!(!is_nfc(decomposed));
        assert_eq!(normalize(decomposed), composed);
        assert!(is_nfc(&normalize(decomposed)));
    }

    #[test]
    fn check_and_normalize_round_trip() {
        let out = check_and_normalize("cafe\u{0301}/x.png").unwrap();
        assert_eq!(out, "café/x.png");
    }

    #[test]
    fn check_and_normalize_all_reports_offender() {
        let err = check_and_normalize_all(["ok.txt", "../bad"]).unwrap_err();
        assert_eq!(err.0, "../bad");
        assert!(err.1.contains("traversal"));
    }
}
