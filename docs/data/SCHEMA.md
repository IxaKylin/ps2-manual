# 寄存器数据格式

每个文件描述一个寄存器块（一个外设或一组相关寄存器），由 `<RegSummary>` 与 `<Reg>` 组件渲染，
并由 `scripts/gen-index.mjs` 汇总为附录 A，由 `scripts/check-addr.mjs` 与 QEMU 源码对照。

## 块级字段

| 字段 | 必填 | 含义 |
|---|---|---|
| `block` | 是 | 块标识，全书唯一，小写加连字符，例如 `ee-intc` |
| `title` | 是 | 中文名称 |
| `page` | 是 | 详细说明所在页面路径，例如 `/chapters/04-ee-intc`，附录 A 据此生成链接 |
| `base` | 否 | 基地址（数字）。IOP 侧写 IOP 物理地址 |
| `size` | 否 | 地址窗口大小 |
| `bus` | 否 | 所在总线：`EE 总线`、`IOP 总线`、`GS 内部`（GS 一般寄存器经 GIF 写入，无总线地址） |
| `access_size` | 否 | 允许的访问宽度说明 |
| `width` | 否 | 寄存器默认位宽，默认 32 |
| `status` | 是 | 默认可信度：`verified`、`reference`、`unimplemented` |
| `qemu.files` | `verified` 时必填 | 实现该块的 QEMU 源文件（相对 qemu 仓库根目录） |
| `registers` | 是 | 寄存器列表 |

## 寄存器字段

| 字段 | 含义 |
|---|---|
| `name` | 寄存器名，使用公开资料中通行的英文名 |
| `addr` | 绝对地址；没有总线地址的（如 GS 一般寄存器、CP0 寄存器）写 `offset` 或省略 |
| `offset` | 相对 `base` 的偏移或寄存器编号 |
| `width` | 位宽（覆盖块默认值），可为 8/16/32/64/128 |
| `access` | `R/W`、`RO`、`WO`、`R/W1C`（写 1 清零）、`R/W1T`（写 1 翻转）、`R/C`（读清零） |
| `reset` | 复位值；未知时省略 |
| `brief` | 汇总表中的一句话功能说明 |
| `desc` | 详细说明 |
| `fields` | 位域列表：`bits`（"7:4" 或 "3"）、`name`、`access`、`reset`、`desc`、`values`（取值 → 含义）、`status` |
| `ops` | 典型操作步骤 |
| `notes` | 注意事项、与其他资料的差异 |
| `source` | 来源列表 |
| `status` | 覆盖块默认可信度 |
| `nodetail` | 为 true 时汇总表不生成跳转链接（页面中没有该寄存器的 `<Reg>` 详情） |

## 可信度

- `verified`：QEMU 已实现，并有 qtest，或经真实 BIOS / Linux 运行验证。
- `reference`：依据 PCSX2、ps2tek 等公开资料，未经本项目测试验证；QEMU 已实现但没有测试覆盖的功能也归入此级，并在 `notes` 中注明“QEMU 已实现，但没有测试覆盖”。
- `unimplemented`：QEMU 未模拟。

## 页面写法

```md
<RegSummary block="ee-intc" />

### I_STAT
<Reg block="ee-intc" name="I_STAT" />
```

每个 `<Reg>` 前用三级标题写寄存器名，以便目录与搜索。
