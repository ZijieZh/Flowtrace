use flowtrace_core::schema::Trace;
use std::collections::HashSet;

/// Render the trace DAG as a Unicode tree starting from steps with no `from_steps`.
pub fn ascii(r: &Trace) -> String {
    let mut out = String::new();
    out.push_str(&format!("{} ({})\n", r.title, r.id));
    out.push_str(&format!("v{} — {} steps\n\n", r.version, r.steps.len()));
    let roots: Vec<&str> = r
        .steps
        .iter()
        .filter(|(_, s)| s.from_steps.is_empty())
        .map(|(k, _)| k.as_str())
        .collect();
    let mut visited: HashSet<&str> = HashSet::new();
    for root in roots {
        ascii_walk(r, root, "", true, &mut out, &mut visited);
    }
    out
}

fn ascii_walk<'r>(
    r: &'r Trace,
    step_id: &'r str,
    prefix: &str,
    is_last: bool,
    out: &mut String,
    visited: &mut HashSet<&'r str>,
) {
    let connector = if is_last { "└── " } else { "├── " };
    out.push_str(prefix);
    out.push_str(connector);
    out.push_str(step_id);
    if let Some(s) = r.steps.get(step_id) {
        out.push_str(&format!(" — {}\n", s.name));
    } else {
        out.push('\n');
    }
    if !visited.insert(step_id) {
        return;
    }
    let children: Vec<&'r str> = r
        .steps
        .iter()
        .filter(|(_, s)| s.from_steps.iter().any(|d| d == step_id))
        .map(|(k, _)| k.as_str())
        .collect();
    let new_prefix = if is_last {
        format!("{}    ", prefix)
    } else {
        format!("{}│   ", prefix)
    };
    let last = children.len().saturating_sub(1);
    for (i, child) in children.iter().enumerate() {
        ascii_walk(r, child, &new_prefix, i == last, out, visited);
    }
}

pub fn mermaid(r: &Trace) -> String {
    let mut out = String::from("graph TD\n");
    for (step_id, step) in &r.steps {
        let safe = step_id.replace('-', "_");
        out.push_str(&format!("  {}[\"{}\"]\n", safe, step.name));
        for dep in &step.from_steps {
            let dep_safe = dep.replace('-', "_");
            out.push_str(&format!("  {} --> {}\n", dep_safe, safe));
        }
    }
    out
}

pub fn dot(r: &Trace) -> String {
    let mut out = String::from("digraph trace {\n  rankdir=TB;\n");
    for (step_id, step) in &r.steps {
        out.push_str(&format!(
            "  \"{}\" [label=\"{}\"];\n",
            step_id,
            step.name.replace('"', "\\\"")
        ));
        for dep in &step.from_steps {
            out.push_str(&format!("  \"{}\" -> \"{}\";\n", dep, step_id));
        }
    }
    out.push_str("}\n");
    out
}
