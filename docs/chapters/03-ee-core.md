# 第 3 章 EE 核心 R5900

R5900 是 Emotion Engine 的主处理器核心，由东芝与索尼共同设计，工作频率 294.912 MHz。它实现 MIPS III 指令集与部分 MIPS IV 指令（如 MOVN/MOVZ、PREF），并增加了 128 位整数 SIMD 指令（MMI，多媒体指令）、第二组乘除寄存器 LO1/HI1、128 位读写指令 LQ/SQ 等扩展。核心内有 COP0 系统控制协处理器和 COP1 单精度浮点单元，并把 VPU0 中的 VU0 作为 COP2 使用。

本章介绍核心的结构、寄存器组、MMI 指令、中断与异常、TLB 与暂存存储器、COP1 与 COP2，最后给出 COP0 寄存器与 COP1 控制寄存器的详细说明。

## 3.1 内部结构

![图 3-1 R5900 核心内部框图](/img/fig3-1-ee-core.svg)

R5900 的主要组成部分如下：

| 部件 | 规格 | 状态 |
|---|---|---|
| 整数流水线 | 两条（I0、I1），双发射，6 级 | 指令语义 <Status s="verified" />，时序 <Status s="unimplemented" /> |
| 通用寄存器 | 32 个，每个 128 位 | <Status s="verified" /> |
| LO/HI | 各 128 位，高 64 位即 LO1/HI1 | <Status s="verified" /> |
| SA | QFSRV 使用的移位量寄存器 | <Status s="verified" /> |
| COP0 | TLB 48 项、异常、Count/Compare 定时器 | TLB 与异常 <Status s="verified" />，Count/Compare 定时器 <Status s="reference" />（QEMU 已实现，但没有测试覆盖） |
| COP1 | 单精度 FPU，32 个 32 位 FPR，累加器 ACC | <Status s="verified" /> |
| COP2 | VU0 宏模式 | <Status s="verified" /> |
| 指令缓存 | 16 KB，2 路组相联，行长 64 字节 | <Status s="unimplemented" /> |
| 数据缓存 | 8 KB，2 路组相联，写回，可锁定一路 | <Status s="unimplemented" /> |
| 暂存存储器 SPR | 16 KB，经 TLB S 位访问 | <Status s="verified" /> |
| 写回缓冲 WBB、不缓存加速缓冲 UCAB | 合并写操作；预取 C=7 页的读 | <Status s="unimplemented" /> |
| 总线接口 BIU | 128 位，接 EE 主总线 | <Status s="verified" /> |

### 3.1.1 流水线

R5900 每个周期取两条指令，在条件满足时成对发射（双发射）。执行部分包括两条整数流水线 I0 和 I1、一个访存单元、一个分支单元，以及 COP1、COP2 的执行单元。每条流水线分 6 级，公开资料中记作 I、Q、R、A、D、W，依次大致对应取指、发射、读寄存器、执行、访存与写回；各级的确切分工没有公开文档可供核对（<Status s="reference" />）。

两条指令能否同时发射取决于它们所用的执行单元与数据相关：两条指令不能同时使用只有一份的单元（如访存单元、分支单元、COP1）；后一条指令不能使用前一条指令的结果。乘除指令有两套：MULT、DIV 等在 I0 中执行，结果写 LO/HI；MULT1、DIV1 等在 I1 中执行，结果写 LO1/HI1，两者可以并行。128 位 MMI 指令同时占用 I0 和 I1。

与其他 MIPS 处理器一样，跳转与分支指令之后的一条指令（延迟槽）总会执行；Likely 形式的分支（BEQL 等）在不跳转时取消延迟槽指令。

::: tip
QEMU 按指令执行语义模拟 R5900，不模拟流水线、双发射、缓存及相应的周期数。程序的功能结果正确，但执行时间与真实硬件不同。
:::

### 3.1.2 地址宽度

R5900 的通用寄存器和 ALU 支持 64 位运算（DADDU、DSLL 等在任何模式下都可用），但虚拟地址只有 32 位：有效地址按 32 位计算并符号扩展，没有 MIPS III 的 64 位地址段（XKUSEG 等）。CP0 寄存器均为 32 位，没有 DMFC0、DMTC0 指令。地址空间的划分见第 2 章。

## 3.2 寄存器组

### 3.2.1 通用寄存器

R5900 有 32 个 128 位通用寄存器 `$0`–`$31`，其中 `$0` 恒为 0。普通 MIPS 指令只使用低 64 位，64 位读写指令（LD、SD）与运算指令（DADDU 等）不改变高 64 位；32 位运算指令把结果符号扩展到 64 位。128 位的完整内容只能由 MMI 指令、LQ/SQ、QMFC2/QMTC2 访问。

LQ、SQ 的有效地址忽略低 4 位，即总是按 16 字节对齐访问，不产生地址错误异常。

### 3.2.2 LO/HI 与 LO1/HI1

LO 与 HI 各为 128 位：

| 部分 | 名称 | 写入指令 | 读出指令 |
|---|---|---|---|
| LO 第 63:0 位 | LO | MULT、MULTU、DIV、DIVU、MADD、MADDU、MTLO | MFLO |
| HI 第 63:0 位 | HI | 同上，以及 MTHI | MFHI |
| LO 第 127:64 位 | LO1 | MULT1、MULTU1、DIV1、DIVU1、MADD1、MADDU1、MTLO1 | MFLO1 |
| HI 第 127:64 位 | HI1 | 同上，以及 MTHI1 | MFHI1 |

R5900 的 MULT、MULTU、MADD、MADDU 及其“1”形式为三操作数形式：除写 LO/HI 外，结果的低 32 位还写入 rd。MMI 的 PMULTW、PMADDH、PDIVW 等使用 LO/HI 的全部 128 位；PMFLO、PMFHI、PMTLO、PMTHI 以 128 位整体读写，PMFHL、PMTHL 按多种格式在 LO、HI 与通用寄存器之间交换数据。

### 3.2.3 SA 寄存器

SA（Shift Amount）是 QFSRV 指令使用的移位量寄存器。QFSRV 把 rs 与 rt 拼成 256 位，按 SA 指定的字节数右移，取低 128 位写入 rd，用于拼接不对齐的 128 位数据。

| 指令 | 作用 |
|---|---|
| `MTSAB rs, imm` | SA ← (rs ^ imm) 的低 4 位，单位为字节 |
| `MTSAH rs, imm` | SA ← ((rs ^ imm) 的低 3 位) × 2，单位为半字 |
| `MTSA rs` | 写 SA |
| `MFSA rd` | 读 SA |

<Status s="verified" /> QEMU 中 SA 保存字节数，MTSA、MTSAB、MTSAH 写入时截取到 0–15。

## 3.3 MMI 指令

MMI（Multimedia Instructions）使用 MIPS 的 SPECIAL2 主操作码（`0x1C`），把 128 位通用寄存器看作 16 个字节、8 个半字、4 个字或 2 个双字并行运算。MMI 按功能分为下列几类：

| 类别 | 主要指令 | 说明 |
|---|---|---|
| 加减与饱和运算 | PADDB/H/W、PSUBB/H/W、PADDSB/H/W、PSUBSB/H/W、PADDUB/H/W、PSUBUB/H/W、PADSBH | 回绕、有符号饱和、无符号饱和三种方式 |
| 比较与最值 | PCGTB/H/W、PCEQB/H/W、PMAXH/W、PMINH/W、PABSH/W | 比较结果为全 1 或全 0 |
| 逻辑运算 | PAND、POR、PXOR、PNOR | 128 位按位运算 |
| 移位 | PSLLH/W、PSRLH/W、PSRAH/W（立即数）、PSLLVW、PSRLVW、PSRAVW、QFSRV | QFSRV 使用 SA |
| 乘法与乘加 | PMULTH/W、PMULTUW、PMADDH/W、PMADDUW、PMSUBH/W、PHMADH、PHMSBH | 结果写 LO/HI（128 位） |
| 除法 | PDIVW、PDIVUW、PDIVBW | 商写 LO，余数写 HI |
| 打包与展开 | PEXTLB/H/W、PEXTUB/H/W、PPACB/H/W、PEXT5、PPAC5、PINTH、PINTEH | 交错、压缩；PEXT5/PPAC5 用于 16 位与 32 位颜色格式互换 |
| 重排 | PCPYLD、PCPYUD、PCPYH、PEXCH、PEXCW、PEXEH、PEXEW、PREVH、PROT3W | 半字或字的位置交换 |
| LO/HI 访问 | PMFHI、PMFLO、PMTHI、PMTLO、PMFHL、PMTHL | 128 位读写 LO/HI |
| 其他 | PLZCW | 统计与符号位相同的前导位个数 |
| 第二组乘除 | MULT1、MULTU1、DIV1、DIVU1、MADD1、MADDU1、MFHI1、MTHI1、MFLO1、MTLO1 | 使用 LO1/HI1 |

<Status s="verified" /> QEMU 实现全部 MMI 指令。编码中规定为 0 的位域不为 0 时按保留指令处理（产生 RI 异常）；PMFHL 的格式字段为 5–31 时同样产生 RI 异常（PCSX2 忽略这种情况）。

## 3.4 中断

R5900 有三个中断源，对应 Cause 的 IP 位与 Status 的 IM 位：

| 中断 | Cause 位 | Status 屏蔽位 | 来源 |
|---|---|---|---|
| INT0 | IP2（第 10 位） | IM2 | EE INTC（第 4 章） |
| INT1 | IP3（第 11 位） | IM3 | DMAC（第 6 章） |
| 定时器 | IP7（第 15 位） | IM7 | COP0 Count = Compare（QEMU 已实现，但没有测试覆盖） |

处理器响应中断须同时满足：

- Status.IE = 1；
- Status.EIE = 1（R5900 特有的总中断允许位）；
- Status.EXL = 0 且 Status.ERL = 0；
- (Cause.IP & Status.IM) ≠ 0。

### 3.4.1 EI 与 DI

`EI` 把 Status.EIE 置 1，`DI` 把 EIE 清零，用于快速开关中断而不改变 IE 与 IM。执行条件：

1. COP0 可用（内核模式，或 Status.CU0 = 1），否则产生协处理器不可用异常；
2. 处于内核模式，或 Status.EDI = 1；否则指令无效（不改变 EIE，也不产生异常）。

<Status s="verified" /> QEMU 中 EI 执行后立即检查待处理的中断，下一条指令执行之前即可进入中断处理程序。管理模式下的 EI/DI 尚未测试。

### 3.4.2 BC0T/BC0F 与 CPCOND0

R5900 的 COP0 条件信号 CPCOND0 由 DMAC 产生：

```
CPCOND0 = ((D_STAT.CIS | ~D_PCR.CPC) & 0x3FF) == 0x3FF
```

即 D_PCR.CPC 选定的每个 DMA 通道都已置位其 D_STAT.CIS 时，CPCOND0 为 1。程序可以用 `BC0T`（CPCOND0 = 1 时跳转）、`BC0F`（为 0 时跳转）以及 Likely 形式 `BC0TL`、`BC0FL` 等待 DMA 完成，不必读 DMAC 寄存器。

<Status s="verified" /> QEMU 中 DMAC 在 D_STAT、D_PCR 改写及复位时重新计算 CPCOND0；BC0x 位于延迟槽中或 rt 字段大于 3 时产生 RI 异常；COP0 不可用时产生协处理器不可用异常。

## 3.5 异常

R5900 把异常分为两级。第 1 级异常（中断、TLB、地址错误、系统调用等）置 Status.EXL，返回地址存入 EPC；第 2 级异常（复位、NMI、性能计数器、调试）置 Status.ERL，返回地址存入 ErrorEPC。ERET 根据 ERL、EXL 返回到 ErrorEPC 或 EPC。

### 3.5.1 异常向量

| 异常 | 级 | BEV = 0 | BEV = 1 | QEMU |
|---|---|---|---|---|
| 复位、NMI | 2 | `0xBFC00000` | `0xBFC00000` | <Status s="verified" /> |
| TLB 重填 | 1 | `0x80000000` | `0xBFC00200` | BEV = 0：<Status s="verified" />（Linux shell 等工作负载）；BEV = 1：<Status s="reference" /> |
| 性能计数器 | 2 | `0x80000080` | `0xBFC00280` | <Status s="unimplemented" /> |
| 调试 | 2 | `0x80000100` | `0xBFC00300` | <Status s="unimplemented" /> |
| 其他第 1 级异常 | 1 | `0x80000180` | `0xBFC00380` | <Status s="verified" /> |
| 中断 | 1 | `0x80000200` | `0xBFC00400` | <Status s="verified" /> |

第 2 级异常（性能计数器、调试）的向量由 Status.DEV 选择，为 1 时使用 `0xBFC00xxx`。

R5900 没有 MIPS32 的 Cause.IV 位与向量中断模式，中断总是使用偏移 `0x200`。TLB 重填只有一个向量（偏移 `0x000`），没有 64 位地址的 XTLB 重填向量。EXL 已为 1 时发生的 TLB 缺失按一般异常处理，进入偏移 `0x180`。

::: warning
QEMU 中 BEV = 1 时的中断向量 `0xBFC00400` 尚未测试（R17-09(a)）。
:::

### 3.5.2 异常处理过程

发生第 1 级异常时，处理器：

1. 若 Status.EXL = 0，把出错指令的地址写入 EPC（若在延迟槽中则写分支指令的地址，并置 Cause.BD），然后置 Status.EXL；若 EXL 已为 1，不改变 EPC 与 BD；
2. 把异常码写入 Cause.ExcCode，按异常类型写 BadVAddr、Context、EntryHi 或 Cause.CE；
3. 转到对应向量，进入内核模式。

异常码见 [Cause](#cause) 寄存器。

## 3.6 TLB 与暂存存储器

### 3.6.1 TLB

R5900 的 TLB 有 48 项，全相联。每项映射一对相邻的虚拟页（偶数页、奇数页），页大小由 PageMask 选择，从 4 KB 到 16 MB。TLB 项的内容经 EntryHi、EntryLo0、EntryLo1、PageMask 四个 CP0 寄存器交换：

| 指令 | 作用 |
|---|---|
| `TLBWI` | 把四个寄存器写入 Index 指定的 TLB 项 |
| `TLBWR` | 写入 Random 指定的 TLB 项 |
| `TLBR` | 把 Index 指定的 TLB 项读到四个寄存器 |
| `TLBP` | 查找与 EntryHi 匹配的项，结果写 Index |

EntryLo 的 C 位域选择该页的缓存方式：2 为不缓存，3 为缓存（写回），7 为不缓存加速（读时经 UCAB 预取，适合顺序读取不能缓存的数据）。

### 3.6.2 暂存存储器与 S 位

暂存存储器 SPR 是 16 KB 的片上 SRAM，访问速度与数据缓存相当。它不在物理地址空间中，CPU 只能经 S 位为 1 的 TLB 项访问它。

EntryLo0 的第 31 位 S 置 1 时，该 TLB 项把从 VPN2 开始的 16 KB 虚拟地址映射到 SPR，此时 PFN、C、V、D 以及 PageMask 都被忽略，该区域可读、可写、可执行；ASID 与 G 位照常起作用。PS2 内核一般把 SPR 映射到 `0x70000000`。

DMAC 通道 8（fromSPR）与通道 9（toSPR）经 Dn_SADR 访问 SPR；其他通道的 Dn_MADR 第 31 位为 1 时也表示 SPR（见第 6 章）。

<Status s="verified" /> QEMU 把 SPR 放在 CPU 地址空间的 `0x100000000`（32 位总线之外），只有 S 项能映射到该处；DMA 一侧在 `0x80000000` 看到同一块存储器。测试用例 `ps2/scratchpad` 与 `ps2/dmac/spr` 覆盖了 CPU 与 DMA 两条访问路径。

## 3.7 COP1 浮点单元

COP1 是单精度浮点单元，有 32 个 32 位浮点寄存器 FPR 和一个累加器 ACC。它没有双精度运算，也不完全遵循 IEEE 754：

| 项目 | R5900 FPU | IEEE 754 |
|---|---|---|
| 非规格化数 | 不支持。指数为 0 的操作数按 0 处理；非规格化结果置为 0，并置 U 标志 | 支持 |
| 无穷大、NaN | 不支持。指数为 255 的数按普通数处理 | 支持 |
| 上溢 | 结果钳位为最大规格化数 ±`0x7F7FFFFF`，置 O 标志 | 结果为无穷大 |
| 舍入方式 | 固定为向零舍入 | 可选 |
| 浮点异常 | 不产生异常，只置 FCR31 标志 | 可产生异常 |

除 MIPS 通用的 ADD.S、SUB.S、MUL.S、DIV.S、SQRT.S、ABS.S、NEG.S、MOV.S、C.cond.S、CVT.S.W、CVT.W.S 外，R5900 增加了：

| 指令 | 作用 |
|---|---|
| RSQRT.S | fd = fs / sqrt(ft) |
| ADDA.S、SUBA.S、MULA.S | 结果写 ACC |
| MADD.S、MSUB.S | fd = ACC ± fs × ft |
| MADDA.S、MSUBA.S | ACC = ACC ± fs × ft |
| MAX.S、MIN.S | 最大值、最小值 |

比较指令只有 C.F.S、C.EQ.S、C.LT.S、C.LE.S 四种，结果写 FCR31.C，BC1T/BC1F 据此跳转。

<Status s="verified" /> QEMU 按上表实现 COP1：操作数钳位（指数为 0 按 0，指数为 255 按最大规格化数），结果向零舍入，并按 R5900 的 FCR31 格式置标志；CVT.W.S 对超出范围的值饱和；其他 COP1 编码产生 RI 异常。DIV.S、MADD.S 溢出等细节采用 PCSX2 解释器的语义，可能与 PCSX2 动态重编译器的结果不同。

## 3.8 COP2：VU0 宏模式

VU0 可以作为 R5900 的协处理器 2 使用，称为宏模式（macro mode）。此时 R5900 直接执行 VU0 的上部指令（VADD、VMUL 等）与大部分下部指令，并可读写 VU0 的 32 个 128 位浮点寄存器 VF 与 16 个 16 位整数寄存器 VI：

| 指令 | 作用 |
|---|---|
| `QMFC2 rt, vf` / `QMTC2 rt, vf` | 在 128 位通用寄存器与 VF 之间传送 |
| `CFC2 rt, vi` / `CTC2 rt, vi` | 读写 VI 与控制寄存器（状态标志、FBRST、TPC 等） |
| `LQC2 vf, off(base)` / `SQC2` | 在主存与 VF 之间传送 128 位 |
| `VCALLMS imm` / `VCALLMSR` | 启动 VU0 微程序（微模式），起始地址由立即数或 CMSAR0 给出 |
| 宏指令 | VADD、VMADD、VDIV、VSQRT 等，运算与微模式中的同名指令相同 |

QMFC2、QMTC2、CFC2、CTC2 的第 0 位（I 位）用于与 VU0 微程序互锁。VU0 寄存器与微程序的详细说明见第 7 章。

<Status s="verified" /> QEMU 通过 `r5900-cop2` 接口把 COP2 指令交给 `ps2-vu0` 设备执行。Status.CU2 为 0 时产生协处理器不可用异常（CE = 2），LQC2/SQC2 在访问内存前检查。互锁位按空操作处理，因为 QEMU 中 VU0 微程序总是一次运行到结束。BC2F、BC2T 未实现。

## 3.9 寄存器汇总

### 3.9.1 COP0 寄存器

COP0 寄存器没有总线地址，表中“地址”一栏为 CP0 寄存器编号，用 `MFC0 rt, $n` 与 `MTC0 rt, $n` 访问。

<RegSummary block="ee-cop0" />

### 3.9.2 COP1 控制寄存器

COP1 控制寄存器用 `CFC1 rt, $n` 与 `CTC1 rt, $n` 访问，表中“地址”一栏为寄存器编号。

<RegSummary block="ee-cop1" />

## 3.10 寄存器说明

### Index
<Reg block="ee-cop0" name="Index" />

### Random
<Reg block="ee-cop0" name="Random" />

### EntryLo0
<Reg block="ee-cop0" name="EntryLo0" />

### EntryLo1
<Reg block="ee-cop0" name="EntryLo1" />

### Context
<Reg block="ee-cop0" name="Context" />

### PageMask
<Reg block="ee-cop0" name="PageMask" />

### Wired
<Reg block="ee-cop0" name="Wired" />

### BadVAddr
<Reg block="ee-cop0" name="BadVAddr" />

### Count
<Reg block="ee-cop0" name="Count" />

### EntryHi
<Reg block="ee-cop0" name="EntryHi" />

### Compare
<Reg block="ee-cop0" name="Compare" />

### Status
<Reg block="ee-cop0" name="Status" />

### Cause
<Reg block="ee-cop0" name="Cause" />

### EPC
<Reg block="ee-cop0" name="EPC" />

### PRId
<Reg block="ee-cop0" name="PRId" />

### Config
<Reg block="ee-cop0" name="Config" />

### BadPAddr
<Reg block="ee-cop0" name="BadPAddr" />

### Debug
<Reg block="ee-cop0" name="Debug" />

### Perf
<Reg block="ee-cop0" name="Perf" />

### TagLo
<Reg block="ee-cop0" name="TagLo" />

### TagHi
<Reg block="ee-cop0" name="TagHi" />

### ErrorEPC
<Reg block="ee-cop0" name="ErrorEPC" />

### FCR0
<Reg block="ee-cop1" name="FCR0" />

### FCR31
<Reg block="ee-cop1" name="FCR31" />

## 3.11 编程要点

### 3.11.1 复位后的初始化

复位后 PC = `0xBFC00000`，Status.BEV = 1、ERL = 1，异常使用 `0xBFC00xxx` 引导向量。BIOS 一般按以下顺序初始化核心：

1. 设置 Status：清除 ERL，置 CU0（需要时置 CU1、CU2 以使用 FPU 与 VU0 宏指令），IE、EIE 暂时保持为 0；
2. 写 Config.K0 选择 KSEG0 的缓存方式，并用 CACHE 指令按索引清除指令缓存与数据缓存的标记；
3. 写 Wired，用 TLBWI 逐项写入 TLB（包括映射 SPR 的 S 项），其余项写为无效；
4. 把异常处理程序复制到 `0x80000000` 起的向量位置，回写数据缓存并无效指令缓存；
5. 清除 Status.BEV，切换到正常向量；
6. 初始化 INTC、DMAC 等外设后，置 IM2、IM3（需要时置 IM7）与 IE，最后执行 EI。

### 3.11.2 映射暂存存储器

```asm
    li    t0, 0x70000000      # VPN2，ASID = 0
    mtc0  t0, $10             # EntryHi
    li    t0, 0x80000006      # S = 1，D = 1，V = 1
    mtc0  t0, $2              # EntryLo0
    li    t0, 0x00000006
    mtc0  t0, $3              # EntryLo1（S 项中不使用）
    mtc0  zero, $5            # PageMask（S 项中不使用）
    li    t0, 1
    mtc0  t0, $0              # Index = 1
    sync.p
    tlbwi
    sync.p
```

此后 `0x70000000`–`0x70003FFF` 即为 SPR。

### 3.11.3 中断处理程序入口

1. 在中断向量 `0x80000200` 处读 Cause，判断 IP2（INTC）、IP3（DMAC）或 IP7（定时器）；
2. INTC 中断：读 I_STAT 与 I_MASK，处理后向 I_STAT 写 1 清除；DMAC 中断：读 D_STAT，处理后写 1 清除 CIS 位；定时器中断：写 Compare 清除 IP7；
3. 恢复寄存器后执行 ERET。ERET 清除 EXL 并返回到 EPC。

### 3.11.4 等待 DMA 完成

1. 在 D_PCR.CPC 中置 1 要等待的通道（例如通道 2 GIF）；
2. 启动 DMA；
3. 循环执行跳回自身的 `bc0f`（延迟槽放 `nop`），直至 CPCOND0 = 1；
4. 写 D_STAT 清除对应的 CIS 位。

::: warning
BC0T、BC0F 不能放在另一条分支指令的延迟槽中，否则产生保留指令异常。
:::

## 3.12 QEMU 模型说明

QEMU 中 R5900 由 `-cpu R5900` 选择，PS2 机器默认使用该型号。R5900 相关的改动都以 `INSN_R5900` 为条件，不影响其他 MIPS 型号。

**已模拟：**

- 32 位地址：任何模式下有效地址都按 32 位计算并符号扩展；JR/JALR 目标与 MTC0 写入值按第 31 位符号扩展；64 位运算在所有模式下可用；DMFC0/DMTC0 产生 RI 异常；
- 全部 MMI 指令、LQ/SQ、SA 寄存器与 LO1/HI1；
- EI/DI 与 Status.EIE、EDI；BC0F/BC0T/BC0FL/BC0TL 与 CPCOND0；
- TLB 48 项（PRId `0x2E20`，Config 报告 16 KB 指令缓存与 8 KB 数据缓存）与 S 位暂存存储器；TLBR 读回的 S 位与写入值一致；
- 中断固定使用偏移 `0x200`；Status 中可写的中断屏蔽位只有 IM2、IM3、IM7；
- COP1 的 R5900 指令子集、钳位与标志；COP2 宏模式经 `r5900-cop2` 接口连接 VU0；
- ERET 或 JR 跳转到奇数地址时产生地址错误异常；
- EE 与 IOP 在不同的主机线程上运行（MTTCG），除非指定 `-accel tcg,thread=single` 或 `-icount`。

对应的 qtest 测试用例：`ps2/scratchpad`、`ps2/cop0`、`ps2/fpu`、`ps2/cop2`、`ps2/r5900-addr`、`ps2/mmi`、`ps2/mmi/ops`、`ps2/prid-split`。

**未模拟或与硬件不同：**

| 项目 | 说明 |
|---|---|
| 流水线与缓存 | 不模拟双发射、周期数、指令缓存、数据缓存、WBB、UCAB；C 位域与 Config.K0 只保存不起作用；CACHE 指令不改变任何状态 |
| 性能计数器、调试断点 | CP0 第 24、25 号寄存器的 R5900 功能未实现，不会发生性能计数异常与调试异常 |
| BadPAddr | CP0 第 23 号寄存器按通用 MIPS 的 Debug 寄存器处理 |
| BC2F/BC2T | 未实现 |
| FCR0 | CFC1 读出 `0x2E00`，经 gdbstub 读出 `0x2E30`（R7-05） |
| LDC1/SDC1 | 仍按通用 MIPS 的 64 位指令执行（R7-04） |
| MADD.S 溢出 | 乘积溢出时结果为 0 且不置 O，与 PCSX2 动态重编译器不同（R7-09） |
| PC 回绕 | 顺序执行或分支越过 `0x7FFFFFFC` 时不回绕（R8-04） |
| S 项对齐 | VPN2 不是 16 KB 对齐的 S 项映射其所在的整个 16 KB 块（R3-06） |
| 未测试 | 管理模式下的 EI/DI（R7-07(g)）、BEV = 1 时的中断向量（R17-09(a)）、调试与 NMI 入口的地址回绕（R8-03）；Count/Compare 定时器与 IP7、Context、BadVAddr、Config、ErrorEPC 以及 TLBP 失败时的 Index.P、Status.BEV 与 Status.ERL（复位值及其作用，R17-09(a)），QEMU 已实现，但没有测试覆盖，按参考级标注 |
