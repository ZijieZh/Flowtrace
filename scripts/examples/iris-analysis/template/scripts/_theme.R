# Shared plotting theme + palette for this trace.
#
# Every per-plot script begins with `source("scripts/_theme.R")`, then calls
# `ggsave_default(working_path("<name>.png"), plot)` to write into the run.
# `working_path()` honors $TRACE_OUTPUT_DIR so build.sh can route output
# to the active step folder (`runs/<run_id>/<step_id>/`).

suppressPackageStartupMessages({
  library(ggplot2)
  library(scales)
})

# ─── Morph-traces slate palette ───────────────────────────────────────────
# Mirrors the frontend's Tailwind slate scale + status accents.
INK       <- "#0f172a"  # slate-900 — primary marks / dark text
INK_SOFT  <- "#334155"  # slate-700 — secondary marks
INK_MUTED <- "#94a3b8"  # slate-400 — tertiary
SURFACE   <- "#f1f5f9"  # slate-100 — fills
EDGE      <- "#cbd5e1"  # slate-300 — gridlines
DONE      <- "#047857"  # green-700
RUNNING   <- "#1d4ed8"  # blue-700
BLOCKED   <- "#b45309"  # amber-700
ERROR     <- "#b91c1c"  # red-700

species_colors <- c(setosa = INK, versicolor = INK_SOFT, virginica = INK_MUTED)

# Sequential palette used by the iris demo plots.
trace_palette <- function(n, style = "slate") {
  base <- switch(style,
                 ocean = c(INK, INK_SOFT, INK_MUTED),
                 slate = c(INK, INK_SOFT, INK_MUTED),
                 c(INK, INK_SOFT, INK_MUTED))
  if (n <= length(base)) base[seq_len(n)] else colorRampPalette(base)(n)
}

theme_set(
  theme_minimal(base_size = 11, base_family = "sans") +
    theme(
      plot.title       = element_text(color = INK,      face = "bold", hjust = 0, size = 12),
      plot.subtitle    = element_text(color = INK_MUTED, hjust = 0, size = 10, margin = margin(b = 8)),
      plot.background  = element_rect(fill = "white", color = NA),
      panel.background = element_rect(fill = "white", color = NA),
      panel.grid.major = element_line(color = EDGE, linewidth = 0.3, linetype = "dotted"),
      panel.grid.minor = element_blank(),
      panel.grid.major.x = element_blank(),
      axis.text        = element_text(color = INK_MUTED, size = 9),
      axis.title       = element_text(color = INK_SOFT,  size = 10),
      axis.ticks       = element_line(color = EDGE, linewidth = 0.3),
      axis.line        = element_blank(),
      legend.title     = element_text(color = INK_SOFT,  size = 10),
      legend.text      = element_text(color = INK_SOFT,  size = 9),
      legend.background= element_blank(),
      legend.key       = element_blank(),
      legend.position  = "bottom",
      strip.text       = element_text(color = INK_SOFT, size = 10, face = "bold")
    )
)

.TRACE_W <- 800
.TRACE_H <- 500
.TRACE_DPI <- 144

ggsave_default <- function(path, plot = last_plot(), w = .TRACE_W, h = .TRACE_H) {
  ggsave(path, plot = plot, width = w / .TRACE_DPI, height = h / .TRACE_DPI,
         dpi = .TRACE_DPI, units = "in", bg = "white", device = "png")
}

# Resolve the per-step output directory. Honors $TRACE_OUTPUT_DIR, falls
# back to ./outputs/ if unset.
working_path <- function(filename) {
  base <- Sys.getenv("TRACE_OUTPUT_DIR", unset = "outputs")
  if (!dir.exists(base)) dir.create(base, recursive = TRUE)
  file.path(base, filename)
}

read_iris <- function() {
  path <- Sys.getenv("TRACE_IRIS_CSV", unset = "data/iris.csv")
  read.csv(path, stringsAsFactors = FALSE)
}
