//! `trace explain` — schema documentation printer.
//!
//! Mirrors `kubectl explain` for our types: takes a dotted path like
//! `reply` or `reply.evidence.figure` or `state.steps.assets`, prints the
//! description and field listing for that type. Source of truth: the
//! `schemars` JSON Schema generated from the same Rust structs the CLI
//! validates against — so this output can never drift from what the binary
//! accepts.
//!
//! Three output formats:
//!   - `plaintext` (default) — kubectl-style "FIELD / DESCRIPTION / FIELDS"
//!   - `example`             — a minimal valid JSON instance for the type
//!   - `jsonschema`          — the raw JSON Schema (for validators / tooling)

use anyhow::{anyhow, Context, Result};
use schemars::schema::{InstanceType, RootSchema, Schema, SchemaObject, SingleOrVec};
use schemars::schema_for;
use serde_json::{json, Map, Value};

/// Top-level types `trace explain` can describe. Anything else is an error
/// with a hint listing valid roots.
const ROOTS: &[&str] = &["reply", "state", "trace", "run_detail"];

/// Output format for `trace explain`.
#[derive(Clone, Copy, Debug, clap::ValueEnum)]
#[clap(rename_all = "snake_case")]
pub enum ExplainFormat {
    /// Human-readable schema (default; kubectl-explain style).
    Plaintext,
    /// Minimal valid JSON instance for the type.
    Example,
    /// Raw JSON Schema (Draft 2020-12 via schemars).
    Jsonschema,
}

/// Entry point: render the schema rooted at `path` in the requested format.
pub fn explain(path: &str, fmt: ExplainFormat) -> Result<String> {
    let (root, rest) = split_root(path)?;
    let schema = root_schema_for(root);
    let target =
        navigate(&schema, &schema.schema, &rest).with_context(|| {
            format!("path `{}` does not exist in `{}` schema", path, root)
        })?;
    Ok(match fmt {
        ExplainFormat::Plaintext => render_plaintext(root, &rest, &schema, &target),
        ExplainFormat::Example => render_example(&schema, &target),
        ExplainFormat::Jsonschema => render_jsonschema(&schema, &target),
    })
}

/// Split `reply.evidence.figure` into (`reply`, `["evidence", "figure"]`).
/// Errors with a hint if the root is unknown.
fn split_root(path: &str) -> Result<(&'static str, Vec<&str>)> {
    let mut parts = path.split('.');
    let root_input = parts.next().unwrap_or("");
    let root = ROOTS
        .iter()
        .find(|r| **r == root_input)
        .copied()
        .ok_or_else(|| {
            anyhow!(
                "unknown root `{}`; expected one of: {}",
                root_input,
                ROOTS.join(", ")
            )
        })?;
    Ok((root, parts.collect()))
}

/// Build the root JsonSchema for `reply` / `state` / `trace` / `run_detail`.
fn root_schema_for(root: &str) -> RootSchema {
    match root {
        "reply" => schema_for!(flowtrace_core::output::StructuredOutput),
        "state" => schema_for!(flowtrace_core::state::RunState),
        "trace" => schema_for!(flowtrace_core::schema::Trace),
        "run_detail" => schema_for!(crate::serve::routes::runs::RunDetail),
        _ => unreachable!("ROOTS filter guarantees one of these"),
    }
}

/// Walk a dotted path through a schema, following `properties`, items,
/// `oneOf` variant tags, and `$ref` indirections. Returns the SchemaObject at
/// the target.
fn navigate<'a>(root: &'a RootSchema, start: &'a SchemaObject, rest: &[&str]) -> Result<SchemaObject> {
    let mut current: SchemaObject = resolve(root, start).clone();
    for seg in rest {
        current = step_into(root, &current, seg)
            .with_context(|| format!("could not descend into `{}`", seg))?;
    }
    Ok(current)
}

/// Follow `$ref` references through the root's definitions to land on a
/// concrete SchemaObject. Returns the input unchanged if no ref.
///
/// Also handles schemars' `allOf: [{"$ref": "..."}]` wrapping, which it emits
/// when a field with a `#[doc = "..."]` comment has a typed reference target —
/// the description goes on the wrapper, the actual type sits inside `allOf`.
fn resolve<'a>(root: &'a RootSchema, s: &'a SchemaObject) -> &'a SchemaObject {
    let mut cur = s;
    loop {
        // Direct $ref.
        if let Some(reference) = cur.reference.as_deref() {
            let name = reference.trim_start_matches("#/definitions/");
            match root.definitions.get(name) {
                Some(Schema::Object(obj)) => {
                    cur = obj;
                    continue;
                }
                _ => return cur,
            }
        }
        // allOf-wrapped ref (single ref-only entry).
        if let Some(sub) = cur.subschemas.as_ref() {
            if let Some(all_of) = sub.all_of.as_ref() {
                if all_of.len() == 1 {
                    if let Schema::Object(inner) = &all_of[0] {
                        if inner.reference.is_some() {
                            cur = inner;
                            continue;
                        }
                    }
                }
            }
            // anyOf-wrapped Option<T>: pick the single non-null ref.
            if let Some(any_of) = sub.any_of.as_ref() {
                let ref_arm = any_of.iter().find_map(|sch| {
                    if let Schema::Object(o) = sch {
                        if o.reference.is_some() {
                            return Some(o);
                        }
                    }
                    None
                });
                if let Some(inner) = ref_arm {
                    cur = inner;
                    continue;
                }
            }
        }
        return cur;
    }
}

/// Descend one path segment. Handles:
///   - object properties (`reply.headline`)
///   - array elements as transparent (`evidence.figure` resolves directly to
///     the `figure` variant of the inner enum, because `.figure` is a tag
///     value of the inner oneOf)
///   - tagged-union variant lookup by tag value (`evidence.figure`)
fn step_into(root: &RootSchema, s: &SchemaObject, seg: &str) -> Result<SchemaObject> {
    let resolved = resolve(root, s).clone();

    // (a) Plain object property.
    if let Some(obj) = resolved.object.as_ref() {
        if let Some(prop) = obj.properties.get(seg) {
            if let Schema::Object(po) = prop {
                return Ok(resolve(root, po).clone());
            }
        }
    }

    // (b) Array — transparently descend into items, then try again on the
    //     element type (so `evidence.figure` works through the `Vec<Evidence>`).
    if let Some(item) = array_item(&resolved) {
        return step_into(root, &item.clone(), seg);
    }

    // (c) Map (`BTreeMap<String, T>`) — transparently descend into the value
    //     type (so `state.steps.status` works through the map keyed by step id).
    if let Some(value) = map_value(&resolved) {
        return step_into(root, &value.clone(), seg);
    }

    // (d) Tagged-union variant — match the segment against each oneOf entry's
    //     `tag` const value.
    if let Some(sub) = resolved.subschemas.as_ref() {
        if let Some(variants) = sub.one_of.as_ref() {
            for v in variants {
                if let Schema::Object(vo) = v {
                    if let Some(tag_val) = tagged_variant_value(root, vo) {
                        if tag_val == seg {
                            return Ok(resolve(root, vo).clone());
                        }
                    }
                }
            }
        }
    }

    Err(anyhow!("no such field, variant, or item key: `{}`", seg))
}

/// For a `#[serde(tag = "...", rename_all = "snake_case")]` enum variant,
/// schemars emits an object whose tag field is a `const` string. Return that
/// const value if the input variant has one.
fn tagged_variant_value(root: &RootSchema, vo: &SchemaObject) -> Option<String> {
    tagged_variant_property(root, vo).map(|(_, v)| v)
}

/// Same as `tagged_variant_value` but returns the property *name* (e.g. `type`,
/// `kind`) — the JSON key that holds the discriminator. Used so the variant
/// listing in `render_plaintext` prints the actual tag-field name (which is
/// `type` for `Evidence` but `kind` for `Status`).
fn tagged_variant_field(root: &RootSchema, vo: &SchemaObject) -> Option<String> {
    tagged_variant_property(root, vo).map(|(n, _)| n)
}

/// If `s` is an array, return its element schema; else `None`. Tuple-typed
/// arrays (`items: [schema, schema, …]`) and boolean-schema items are not
/// supported and yield `None`.
fn array_item<'a>(s: &'a SchemaObject) -> Option<&'a SchemaObject> {
    let arr = s.array.as_ref()?;
    let items = arr.items.as_ref()?;
    match items {
        SingleOrVec::Single(b) => match b.as_ref() {
            Schema::Object(o) => Some(o),
            Schema::Bool(_) => None,
        },
        SingleOrVec::Vec(_) => None,
    }
}

/// If `s` is a "map type" (object with `additionalProperties` and no declared
/// properties — what schemars emits for `BTreeMap<String, T>`), return the
/// value schema. Else `None`.
fn map_value<'a>(s: &'a SchemaObject) -> Option<&'a SchemaObject> {
    let obj = s.object.as_ref()?;
    if !obj.properties.is_empty() {
        return None;
    }
    let ap = obj.additional_properties.as_deref()?;
    match ap {
        Schema::Object(o) => Some(o),
        Schema::Bool(_) => None,
    }
}

/// Find the (property-name, const-value) pair that identifies a tagged-union
/// variant inside `vo`. schemars represents `#[serde(tag = "X")]` as a single
/// property whose schema is a one-element `enum`; we walk the properties and
/// return the first such pair found.
fn tagged_variant_property(root: &RootSchema, vo: &SchemaObject) -> Option<(String, String)> {
    let resolved = resolve(root, vo);
    let obj = resolved.object.as_ref()?;
    for (name, schema) in &obj.properties {
        if let Schema::Object(field) = schema {
            if let Some(enum_values) = field.enum_values.as_ref() {
                if enum_values.len() == 1 {
                    if let Value::String(s) = &enum_values[0] {
                        return Some((name.clone(), s.clone()));
                    }
                }
            }
        }
    }
    None
}

/// kubectl-style plaintext rendering.
fn render_plaintext(root: &str, rest: &[&str], rs: &RootSchema, obj: &SchemaObject) -> String {
    let mut out = String::new();
    let full_path = if rest.is_empty() {
        root.to_string()
    } else {
        format!("{}.{}", root, rest.join("."))
    };
    out.push_str(&format!("KIND:        {}\n", root));
    out.push_str(&format!("FIELD PATH:  {}\n", full_path));
    if let Some(ty) = describe_type(obj) {
        out.push_str(&format!("TYPE:        {}\n", ty));
    }
    out.push('\n');

    let desc = obj
        .metadata
        .as_ref()
        .and_then(|m| m.description.as_deref())
        .unwrap_or("(no description)");
    out.push_str("DESCRIPTION:\n");
    for line in wrap(desc, 78) {
        out.push_str(&format!("  {}\n", line));
    }
    out.push('\n');

    // For container types (arrays, maps), transparently unwrap to the element
    // type and render its fields/variants. So `reply.evidence` (array of
    // Evidence) renders the Evidence variants; `state.steps`
    // (map<string, StepState>) renders the StepState fields.
    let target = unwrap_container(rs, obj);

    // Fields (if it's an object).
    if let Some(props) = target.object.as_ref() {
        if !props.properties.is_empty() {
            out.push_str("FIELDS:\n");
            let required: std::collections::HashSet<&String> = props.required.iter().collect();
            for (name, schema) in &props.properties {
                if let Schema::Object(po) = schema {
                    let resolved = resolve(rs, po);
                    // Prefer the field's own type label (may carry the ref name
                    // via allOf/anyOf wrapping); fall back to the resolved type.
                    let ty = describe_type(po)
                        .or_else(|| describe_type(resolved))
                        .unwrap_or_else(|| "<unknown>".into());
                    let req_mark = if required.contains(name) { " (required)" } else { "" };
                    out.push_str(&format!("  {} <{}>{}\n", name, ty, req_mark));
                    let pdesc = po
                        .metadata
                        .as_ref()
                        .and_then(|m| m.description.as_deref())
                        .or_else(|| resolved.metadata.as_ref().and_then(|m| m.description.as_deref()))
                        .unwrap_or("");
                    if !pdesc.is_empty() {
                        for line in wrap(pdesc, 76) {
                            out.push_str(&format!("    {}\n", line));
                        }
                    }
                    out.push('\n');
                }
            }
        }
    }
    // Variants (if it's a tagged union — either at this level or one container hop away).
    if let Some(sub) = target.subschemas.as_ref() {
        if let Some(variants) = sub.one_of.as_ref() {
            let tag_field = variants
                .iter()
                .find_map(|v| {
                    if let Schema::Object(vo) = v {
                        tagged_variant_field(rs, vo)
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| "type".to_string());
            out.push_str(&format!("VARIANTS (discriminated by `{}`):\n", tag_field));
            for v in variants {
                if let Schema::Object(vo) = v {
                    if let Some(tag) = tagged_variant_value(rs, vo) {
                        let vdesc = vo
                            .metadata
                            .as_ref()
                            .and_then(|m| m.description.as_deref())
                            .unwrap_or("");
                        out.push_str(&format!("  {} — {}\n", tag, vdesc));
                    }
                }
            }
            out.push('\n');
            out.push_str(&format!(
                "Drill into a variant: `flowtrace explain {}.<variant>`\n",
                full_path
            ));
        }
    }

    out
}

/// Transparently unwrap one layer of container indirection (array → items,
/// map → additionalProperties). Returns the element schema if a container,
/// else returns the input unchanged. Used so `explain reply.evidence` shows
/// the Evidence variants directly and `explain state.steps` shows the
/// StepState fields directly.
fn unwrap_container(rs: &RootSchema, obj: &SchemaObject) -> SchemaObject {
    let s = resolve(rs, obj);
    if let Some(item) = array_item(s) {
        return resolve(rs, item).clone();
    }
    if let Some(value) = map_value(s) {
        return resolve(rs, value).clone();
    }
    s.clone()
}

/// Render a minimal valid JSON example for the schema. Always ends with a newline
/// so the output is line-clean when piped to a file or another command.
fn render_example(rs: &RootSchema, obj: &SchemaObject) -> String {
    let v = example_for(rs, obj, &mut Vec::new());
    let mut s = serde_json::to_string_pretty(&v).unwrap_or_else(|_| String::from("null"));
    s.push('\n');
    s
}

/// Render the raw JSON Schema for this target, pretty-printed.
///
/// The schema is emitted as a `RootSchema`-equivalent: the target's
/// `SchemaObject` becomes the top-level schema *and* the root's `definitions`
/// map is carried along, so any `$ref: "#/definitions/Foo"` inside the target
/// still resolves. (Emitting the bare `SchemaObject` would leave those refs
/// dangling — that's the bug that broke `json-schema-to-typescript`.)
/// Always ends with a newline.
fn render_jsonschema(root: &RootSchema, target: &SchemaObject) -> String {
    let wrapped = RootSchema {
        meta_schema: root.meta_schema.clone(),
        schema: target.clone(),
        definitions: root.definitions.clone(),
    };
    let mut s = serde_json::to_string_pretty(&wrapped).unwrap_or_else(|_| String::from("{}"));
    s.push('\n');
    s
}

/// Build a minimal example value for a schema. Only required fields are filled
/// in; optional fields are skipped to keep the example small. Visited type-
/// reference names prevent infinite recursion on self-referential schemas.
fn example_for(root: &RootSchema, obj: &SchemaObject, visited: &mut Vec<String>) -> Value {
    let s = resolve(root, obj);

    // Tagged union: render the first variant.
    if let Some(sub) = s.subschemas.as_ref() {
        if let Some(variants) = sub.one_of.as_ref() {
            if let Some(Schema::Object(first)) = variants.first() {
                return example_for(root, first, visited);
            }
        }
    }

    // Enum (e.g. ReplyStatus / Status) — pick the first allowed value.
    if let Some(enum_values) = s.enum_values.as_ref() {
        if let Some(first) = enum_values.first() {
            return first.clone();
        }
    }

    // Object: emit required fields only, plus the discriminator if it's an enum-variant object.
    if let Some(obj_v) = s.object.as_ref() {
        let mut out = Map::new();
        // If this object has a tag const (it's an enum variant), include the tag.
        if let Some(tag_val) = tagged_variant_value(root, s) {
            if let Some(tag_field) = obj_v.properties.keys().find(|k| {
                if let Some(Schema::Object(po)) = obj_v.properties.get(*k) {
                    po.enum_values.as_ref().map(|v| v.len() == 1).unwrap_or(false)
                } else {
                    false
                }
            }) {
                out.insert(tag_field.clone(), Value::String(tag_val));
            }
        }
        for name in &obj_v.required {
            if let Some(Schema::Object(po)) = obj_v.properties.get(name) {
                out.insert(name.clone(), example_for(root, po, visited));
            }
        }
        return Value::Object(out);
    }

    // Primitive: type-driven default.
    if let Some(inst) = s.instance_type.as_ref() {
        let primary = match inst {
            SingleOrVec::Single(b) => **b,
            SingleOrVec::Vec(v) => *v.first().unwrap_or(&InstanceType::Null),
        };
        return match primary {
            InstanceType::String => json!("..."),
            InstanceType::Integer => json!(0),
            InstanceType::Number => json!(0.0),
            InstanceType::Boolean => json!(false),
            InstanceType::Array => json!([]),
            InstanceType::Object => json!({}),
            InstanceType::Null => Value::Null,
        };
    }

    Value::Null
}

/// Human-readable type label for one schema node: `string`, `integer`,
/// `[]Evidence`, `map<string, StepState>`, `oneOf`, named-ref types, etc.
fn describe_type(s: &SchemaObject) -> Option<String> {
    if s.reference.is_some() {
        return Some(
            s.reference
                .as_deref()
                .unwrap()
                .trim_start_matches("#/definitions/")
                .to_string(),
        );
    }
    // schemars `allOf: [{"$ref": "..."}]` wrapper — happens when a field
    // with a doc comment refs a named type.
    if let Some(sub) = s.subschemas.as_ref() {
        if let Some(all_of) = sub.all_of.as_ref() {
            if all_of.len() == 1 {
                if let Schema::Object(inner) = &all_of[0] {
                    if let Some(name) = inner
                        .reference
                        .as_deref()
                        .map(|r| r.trim_start_matches("#/definitions/").to_string())
                    {
                        return Some(name);
                    }
                }
            }
        }
        // schemars `anyOf: [{"$ref": "..."}, {"type": "null"}]` wrapper —
        // standard shape for `Option<T>` where T is a named type.
        if let Some(any_of) = sub.any_of.as_ref() {
            let refs: Vec<&str> = any_of
                .iter()
                .filter_map(|sch| {
                    if let Schema::Object(o) = sch {
                        o.reference.as_deref()
                    } else {
                        None
                    }
                })
                .collect();
            if refs.len() == 1 {
                return Some(
                    refs[0]
                        .trim_start_matches("#/definitions/")
                        .to_string(),
                );
            }
        }
    }
    if let Some(item) = array_item(s) {
        let inner = describe_type(item).unwrap_or_else(|| "?".into());
        return Some(format!("[]{}", inner));
    }
    if let Some(value) = map_value(s) {
        let inner = describe_type(value).unwrap_or_else(|| "?".into());
        return Some(format!("map<string, {}>", inner));
    }
    if let Some(sub) = s.subschemas.as_ref() {
        if sub.one_of.is_some() {
            return Some("oneOf".into());
        }
    }
    if let Some(inst) = s.instance_type.as_ref() {
        let primary = match inst {
            SingleOrVec::Single(b) => **b,
            SingleOrVec::Vec(v) => *v.first().unwrap_or(&InstanceType::Null),
        };
        return Some(
            match primary {
                InstanceType::String => "string",
                InstanceType::Integer => "integer",
                InstanceType::Number => "number",
                InstanceType::Boolean => "boolean",
                InstanceType::Array => "array",
                InstanceType::Object => "object",
                InstanceType::Null => "null",
            }
            .to_string(),
        );
    }
    None
}

/// Simple word-wrap for the description block.
fn wrap(text: &str, width: usize) -> Vec<String> {
    let mut out: Vec<String> = vec![];
    for paragraph in text.split('\n') {
        let mut line = String::new();
        for word in paragraph.split_whitespace() {
            if line.is_empty() {
                line.push_str(word);
            } else if line.len() + 1 + word.len() <= width {
                line.push(' ');
                line.push_str(word);
            } else {
                out.push(line.clone());
                line.clear();
                line.push_str(word);
            }
        }
        if !line.is_empty() {
            out.push(line);
        }
    }
    if out.is_empty() {
        out.push(String::new());
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn root_reply_has_headline_and_status() {
        let out = explain("reply", ExplainFormat::Plaintext).unwrap();
        assert!(out.contains("KIND:        reply"));
        assert!(out.contains("headline"));
        assert!(out.contains("status"));
        assert!(out.contains("evidence"));
    }

    #[test]
    fn reply_evidence_lists_variants() {
        let out = explain("reply.evidence", ExplainFormat::Plaintext).unwrap();
        assert!(out.contains("VARIANTS"));
        assert!(out.contains("figure"));
        assert!(out.contains("comparison"));
    }

    #[test]
    fn reply_evidence_figure_has_path() {
        let out = explain("reply.evidence.figure", ExplainFormat::Plaintext).unwrap();
        assert!(out.contains("path"));
    }

    #[test]
    fn unknown_root_errors_with_hint() {
        let err = explain("nope", ExplainFormat::Plaintext).unwrap_err();
        let s = format!("{}", err);
        assert!(s.contains("reply"));
        assert!(s.contains("state"));
        assert!(s.contains("trace"));
    }

    #[test]
    fn example_format_produces_valid_json() {
        let out = explain("reply", ExplainFormat::Example).unwrap();
        let v: Value = serde_json::from_str(&out).unwrap();
        assert!(v.is_object());
        // Minimum: headline + status.
        assert!(v.get("headline").is_some());
        assert!(v.get("status").is_some());
    }

    #[test]
    fn jsonschema_format_produces_valid_json() {
        let out = explain("reply", ExplainFormat::Jsonschema).unwrap();
        let _: Value = serde_json::from_str(&out).unwrap();
    }

    #[test]
    fn state_root_works() {
        let out = explain("state.steps", ExplainFormat::Plaintext).unwrap();
        assert!(out.contains("StepState"));
    }
}
