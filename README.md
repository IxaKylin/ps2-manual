# PS2 芯片技术手册

PlayStation 2 芯片组的非官方技术参考（简体中文，VitePress 静态网站）。内容依据公开资料、开源模拟器源码与 QEMU `-M ps2` 建模结果整理，每个寄存器标注来源与可信度（已验证 / 参考 / 未实现）。

## 本地使用

```sh
npm ci
npm run docs:dev        # 本地预览（自动生成存储器映射图与附录 A）
npm run docs:build      # 构建到 docs/.vitepress/dist
npm run docs:preview    # 预览构建结果
```

站点根路径由环境变量 `DOCS_BASE` 设置，默认 `/ps2-manual/`。

## 检查

```sh
node scripts/check-zh.mjs     # 繁体字、地区用语与术语表
node scripts/check-addr.mjs   # 已验证寄存器地址与 QEMU 源码对照（需要 QEMU 源码树）
```

`check-addr` 默认在 `../qemu` 查找 QEMU 源码（可用环境变量 `QEMU_SRC` 指定），CI 中只运行 `check-zh` 与构建。

## 目录

- `docs/chapters/`：第 1～15 章
- `docs/appendix/`：附录 A 寄存器速查（由 `scripts/gen-index.mjs` 生成）、B 术语表、C 参考资料、D 未验证项与已知差异
- `docs/data/registers/*.yaml`：寄存器数据，格式见 `docs/data/SCHEMA.md`
- `docs/public/img/`：插图（手绘 SVG；`memmap-*.svg` 由 `scripts/gen-memmap.mjs` 生成）

## 部署

`.github/workflows/deploy.yml` 在推送到 `main` 分支时构建并发布到 GitHub Pages；仓库设置中需把 Pages 的来源设为 GitHub Actions。

## 许可

本仓库的文字、插图与脚本采用 BSD 3-Clause 许可，见 [LICENSE](LICENSE)。`docs/public/img/fig15-3-osdsys-qemu.png`、`fig15-4-osdsys-pcsx2.png` 为 Sony BIOS 菜单画面截图，画面内容的权利归 Sony 所有，不在本许可范围内。

## 声明

本手册未使用任何 NDA 文档内容。PlayStation 为 Sony Interactive Entertainment Inc. 的商标，本手册与其无关。
