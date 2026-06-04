<div align="center">

<img src="assets/hero.png" width="440" alt="Flowtrace">

# Flowtrace

**把你的 agent 的工作变成一条透明、可复用、会进化的 trace。**

agent 在其中推理的结构，你随时可以介入。

[![MIT License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](../LICENSE) [![Homepage](https://img.shields.io/badge/Homepage-morphmind.ai-lightgrey?style=flat-square)](https://morphmind.ai) [![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/x9mtbMEx) [![X](https://img.shields.io/badge/X-Follow-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/morphmind__ai?s=11)

[**它能做什么**](#它能做什么) · [**开始使用**](#开始使用) · [**示例**](#示例) · [**文档**](trace/README.md)

[English](../README.md) · **简体中文**

</div>

---

Flowtrace 把你和 agent 一起做的一个任务变成一条 trace：一连串步骤，agent 一步一步走，而不是一长段文字。每一步都把产出留在磁盘上，可以打开核对。它配合你已经在用的 agent 和 skill，包括 Claude Code、Codex、Cursor。

一个真实例子：一个买入或卖出的决策，最后产出一份固定格式、可引用的 PDF。

<div align="center">
<table><tr>
<td align="center" valign="top"><img src="assets/examples/nvda-decision.png" height="340" alt="一个 trace 的流程图：几条采集支线汇入综合论点，再到仓位与风控，最后汇成一份研报"><br><sub>流程</sub></td>
<td align="center" valign="top"><img src="assets/examples/nvda-decision-pdf.png" height="340" alt="交付物：一份固定格式的研报 PDF"><br><sub>交付物</sub></td>
</tr></table>
</div>

<p align="center"><a href="assets/examples/nvda-decision.pdf"><strong>看完整研报 PDF</strong></a></p>

## 它能做什么

**透明。** 整个任务是一条看得见的步骤流程，每一步都能点开看它做了什么。

**有据可查。** 每个结果都能核对：agent 一步一步地做，每一步都把真实文件留在磁盘上。它报出的结果指回这些文件，而不是一句声明。

**可介入。** 这是一个可以指着改的结构，不是一段要往回翻的对话。改动只作用在某一个步骤上，依赖它的步骤随之更新。

**可追溯。** 什么都不会丢。每一次改动都是一个 git commit，每次 run 都留下完整的审计轨迹：换个思路不会覆盖掉管用的那一版，任何更早的版本都能找回来。

**可复用。** trace 一旦建好，下一个同类任务就用同一套步骤跑新的输入。方法是复用，不是重建。

**会进化。** 一个步骤改好一次，之后每次 run 都用上更好的版本。trace 跑得越多，越好用。

## 开始使用

最快的方式是把这个 repo 交给一个 agent。把你的 coding agent（Claude Code、Codex、Cursor）指向这个文件夹，对它说：

> _"装好 Flowtrace，然后跑一下 tailored-resume 这个示例。"_

它会装好 CLI，在 `~/traces/tailored-resume/` 构建一条真实的 trace，并在 `http://localhost:3000` 打开网页视图，流程在那里一步步亮起来。

拿到一条 trace 的两种方式：

- **试一个参考。** 每个示例都带一个 builder，它会建出一个真实的 trace 文件夹，并完整跑一次。

  ```bash
  bash scripts/examples/tailored-resume/build.sh   # → ~/traces/tailored-resume/
  flowtrace serve                                  # → http://localhost:3000
  ```

- **做你自己的。** `make-trace` skill 会把任意素材（一份 `SKILL.md`、一份操作手册、一段对话记录、一件做完的任务）变成一条 trace。把 `skills/make-trace/` 复制到 agent 的 skills 目录，运行 `/make-trace`。

run 是可介入的：在任意步骤停下、改掉它，依赖它的步骤会重跑，其余保持不动。

<details>
<summary>手动安装</summary>

```bash
git clone https://github.com/AIScientists-Dev/flowtrace.git
cd flowtrace
./scripts/install.sh        # 编译，并把 flowtrace 软链到 ~/.local/bin/
```

更新：`git pull && ./scripts/install.sh`。用 `INSTALL_DIR=…` 改软链位置。想从源码构建或参与贡献？见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

</details>

## 示例

**九个示例**，基于流行的开源 skill 构建，覆盖不同领域 —— 点开任意一个，在 [示例画廊](EXAMPLES.zh-CN.md) 看它的流程图和一条命令的 demo：

<div align="center">
<table><tr>
<td align="center" valign="top"><a href="EXAMPLES.zh-CN.md#saas-dd"><img src="assets/examples/feat-saas-dd.png" height="240" alt="SaaS 收购尽职调查流程"></a><br><sub><a href="EXAMPLES.zh-CN.md#saas-dd">SaaS 尽职调查</a></sub></td>
<td align="center" valign="top"><a href="EXAMPLES.zh-CN.md#security-cicd"><img src="assets/examples/feat-security-cicd.png" height="240" alt="安全 CI/CD 流水线流程"></a><br><sub><a href="EXAMPLES.zh-CN.md#security-cicd">安全 CI/CD</a></sub></td>
<td align="center" valign="top"><a href="EXAMPLES.zh-CN.md#distill-mind"><img src="assets/examples/feat-distill-mind.png" height="240" alt="把一个人的思维蒸馏成 skill 流程"></a><br><sub><a href="EXAMPLES.zh-CN.md#distill-mind">蒸馏思维成 skill</a></sub></td>
</tr></table>
</div>

另外六个：

- 📄 求职 — [简历定向优化](EXAMPLES.zh-CN.md#tailored-resume)
- 💰 投资 — [个股综合分析](EXAMPLES.zh-CN.md#nvda-decision)
- ✍️ 研究 / 写作 — [行业深度报告](EXAMPLES.zh-CN.md#research-writer)
- 🐛 软件工程 — [Bug 修复学习循环](EXAMPLES.zh-CN.md#swe-bugfix)
- 📈 增长 / 营销 — [每周付费广告优化](EXAMPLES.zh-CN.md#paid-ads)
- 🖼 设计 / 演示 — [演讲 → 杂志风幻灯片](EXAMPLES.zh-CN.md#talk-to-deck)

## 文档

一条 trace 就是一个 git 仓库。`trace.json` 声明步骤、它们之间的依赖，以及最终的 deliverable。每次 run 存放于 `runs/<run_id>/`：

```
<trace_root>/
├─ .git/                                    标准 git 仓库，审计轨迹
├─ trace.json                              静态方案（步骤 + deliverable）
├─ scripts/                                 多个 step 共用的代码
├─ resources/                               多个 step 共用的静态材料（参考资料 / 论文 / 主数据）
├─ steps/<step_id>/
│  ├─ STEP.md                               该步的说明与实现提示
│  ├─ scripts/                              该步专用的代码
│  └─ resources/                            该步专用的材料（图 / PDF / 测试夹具）
└─ runs/<run_id>/
   ├─ state.json                            run 的状态（唯一真相源）
   ├─ replies/NNNN.json                     仅追加的结构化输出流
   └─ <step_id>/                            运行时文件（asset 与草稿）
```

每一次 CLI 写操作都对应一次 git commit，改动范围严格限定在它声明过的路径上，所以这份 git 历史就是一条完整的审计轨迹，网页视图可以在它之上回溯。step 之间不靠参数传数据，而是靠文件：每一步写出自己的产物，下游直接读它。

| 想了解 | 阅读 |
|---|---|
| 深入理念 | [PHILOSOPHY.md](trace/PHILOSOPHY.md) |
| 作为 agent 驱动一条 trace | [docs/trace/CLI.md](trace/CLI.md) |
| 做一条 trace | [skills/make-trace/SKILL.md](../skills/make-trace/SKILL.md)，或运行 `/make-trace` |
| 格式规范 | [SCHEMA.md](trace/SCHEMA.md) 与 [FIELDS.md](trace/FIELDS.md) |
| 全部示例 | [EXAMPLES.zh-CN.md](EXAMPLES.zh-CN.md) |

---

## 社区

**如果 Flowtrace 对你有用，欢迎给个 star，能帮更多人发现它。**

- **参与贡献**：见 [CONTRIBUTING.md](../CONTRIBUTING.md)，也可以看看 [good first issues](https://github.com/AIScientists-Dev/Flowtrace/labels/good%20first%20issue)。
- **GitHub Issues**：[反馈 bug / 提出建议](https://github.com/AIScientists-Dev/flowtrace/issues)
- **Discord**：[discord.gg/x9mtbMEx](https://discord.gg/x9mtbMEx)
- **X**：[@morphmind__ai](https://x.com/morphmind__ai?s=11)

---

MIT。详见 [`LICENSE`](../LICENSE)。
