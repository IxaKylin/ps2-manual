# 第 15 章 启动流程

PS2 的 EE 与 IOP 在复位后从同一个引导 ROM（ROM0）的同一地址开始执行。ROM0 中的启动代码先按处理器标识把两颗 CPU 分开，然后 EE 初始化主存与 EE 内核，IOP 从 ROM0 中逐个加载系统模块；两侧经 SIF 完成握手后，EE 加载 EELOAD 与 OSDSYS，最终显示主菜单。本章按时间顺序介绍这一过程，以及 QEMU `-M ps2` 机型的两条启动路径。

本章涉及的地址见[第 2 章](/chapters/02-memory-map)，SIF 寄存器与握手标志见[第 11 章](/chapters/11-sif)，IOP 的复位状态见[第 12 章](/chapters/12-iop)，启动时读取的 NVM 配置与 ROMVER 的用法见[第 13 章](/chapters/13-cdvd)。

![图 15-1 启动流程](/img/fig15-1-boot.svg)

## 15.1 复位与 ROM 布局

### 15.1.1 ROM 窗口

PS2 有三个 ROM 窗口，EE 与 IOP 在各自的物理地址空间中以相同地址访问：

**表 15-1 ROM 窗口**

| 名称 | 物理地址 | 大小 | 内容 | 可信度 |
|---|---|---|---|---|
| ROM0 | `0x1FC00000` | 4 MB | 引导 ROM（BIOS）：复位代码、EE 内核、IOP 模块、OSDSYS 等 | <Status s="verified" /> |
| ROM1 | `0x1E000000` | 4 MB | DVD 播放器程序 | <Status s="unimplemented" /> |
| ROM2 | `0x1E400000` | 4 MB | 中文字库（部分型号） | <Status s="unimplemented" /> |

QEMU 把三个窗口都建为只读 ROM 区域，同时映射到 EE 与 IOP 两侧，写入被忽略。ROM0 的内容来自 `-kernel` 给出的文件（15.7 节）；ROM1、ROM2 没有加载映像的选项，内容恒为 0，表中“未模拟”指其内容。

复位后程序经 KSEG1 访问 ROM0，复位向量为 `0xBFC00000`（物理地址 `0x1FC00000`）。两颗 CPU 复位时 SR.BEV = 1，异常也使用 ROM 中的引导向量。

### 15.1.2 ROMDIR

ROM0 由几十个文件顺序拼接而成，文件的索引表称为 ROMDIR。ROMDIR 本身也是 ROM0 中的一个文件，由若干 16 字节的项组成，以一个全 0 的项结束。每项的格式见表 15-2 与图 15-2。

![图 15-2 ROM0 布局与 ROMDIR](/img/fig15-2-romdir.svg)

**表 15-2 ROMDIR 项（16 字节，小端）**

| 偏移 | 大小 | 名称 | 含义 |
|---|---|---|---|
| `0x00` | 10 字节 | 文件名 | ASCII 文件名，不足 10 字节补 0，必须以 0 结尾 |
| `0x0A` | 2 字节 | EXTINFO 大小 | 本文件在 EXTINFO 中的附加信息的字节数，0 表示没有 |
| `0x0C` | 4 字节 | 文件大小 | 本文件的字节数（不含对齐填充） |

ROM0 的组织规则：

1. 第一个文件是 RESET，从 ROM0 偏移 0 开始，内容是复位与引导代码。
2. ROMDIR 紧接在 RESET 之后，第一项就是 RESET 自身的项。RESET 的文件大小按 16 字节向上取整后正好等于 ROMDIR 的偏移，ps2sdk 的 romdrv 以此作为识别 ROM 映像的条件之一。
3. 第二、三项依次是 ROMDIR 与 EXTINFO。EXTINFO 紧接 ROMDIR 之后，保存各文件的日期、版本号与注释等附加信息。
4. 每个文件都从 16 字节边界开始。某文件的偏移等于排在它前面的各文件大小分别按 16 字节向上取整后之和；它的附加信息在 EXTINFO 中的位置等于排在它前面的各项 EXTINFO 大小之和。
5. 查找文件时，先在 ROM0 中搜索第一个以 `RESET` 为名的 16 字节项得到 ROMDIR，再按名逐项比较并累加偏移。

以 SCPH-39001 为例，ROMDIR 位于 ROM0 偏移 `0x2740`（物理地址 `0x1FC02740`），前 4 项依次为 RESET（文件大小 `0x2740`）、ROMDIR（`0x5D0`，即 93 项，含结束项）、EXTINFO（`0x780`）、ROMVER（`0x10`）。QEMU 运行该 BIOS 时，`0x1FC00000` 与 `0x1FC02740` 处读出的字与文件内容一致 <Status s="verified" />。

EXTINFO 中每个文件的附加信息由若干字段组成，每个字段以 4 字节的头开始：16 位值（仅版本字段使用）、8 位附加数据长度、8 位类型（1 日期、2 版本、3 注释、`0x7F` 固定位置）<Status s="reference" />。QEMU 不解析 EXTINFO。

### 15.1.3 ROMVER

ROMVER 文件是一个以换行结束的 ASCII 字符串，前 14 个字符的含义如表 15-3。

**表 15-3 ROMVER 字符串（例：`0160AC20020207`）**

| 字符 | 例 | 含义 |
|---|---|---|
| 0～3 | `0160` | BIOS 版本，前两位为主版本号，后两位为次版本号，`0160` 即 1.60 |
| 4 | `A` | 区域：`J` 日本、`A` 北美、`E` 欧洲、`H` 亚洲、`C` 中国，另有 `T`、`X`、`P` 等用于开发与测试机型 |
| 5 | `C` | 机型类别：`C` 为零售机（Console），`D` 为开发机（Devel） |
| 6～13 | `20020207` | 日期，依次为 4 位年、2 位月、2 位日 |

QEMU 板级代码按 ROMDIR 找到 ROMVER，读出前 14 个字符；前 4 个字符为数字且第 5 个字符存在时，把它作为 `romver` 属性传给 CDVD 设备，由后者确定 NVM 布局与默认区域（[13.11.2 节](/chapters/13-cdvd#_13-11-2-机器属性与-romver)）<Status s="verified" />。ps2-lite-bios 的 ROMVER 为 `0230EC20040614`。

## 15.2 RESET 分流

两颗 CPU 都从 `0xBFC00000` 执行 RESET 文件开头的代码。这段代码读 CP0 第 15 号寄存器 PRId，按读出值转到各自的启动代码：

**表 15-4 RESET 分流**

| CPU | PRId | 转到 | 可信度 |
|---|---|---|---|
| EE（R5900） | `0x2E20`（Imp = `0x2E`） | `0xBFC00800` | <Status s="verified" /> |
| IOP（R3000A） | `0x1F` | `0xBFC02000` | <Status s="verified" /> |

按 ps2tek，Sony BIOS 以 `0x59` 为界：PRId 不小于 `0x59` 时执行 EE 启动代码，否则执行 IOP 启动代码 <Status s="reference" />。ps2-lite-bios 以 `0x100` 为界，两个界限对这两颗 CPU 的结果相同。EE 的 PRId 也可从 Sony BIOS 的串口输出中看到（`CPUID=2e20`）。

ps2-lite-bios 的链接脚本按 Sony BIOS 的做法把 EE 与 IOP 的起点固定在 `0xBFC00800` 与 `0xBFC02000`；SCPH-39001 的 EE 早期初始化代码位于 `0xBFC00854` 附近，与此相符。两颗 CPU 互不等待，各自执行到 15.5 节的 SIF 握手时才开始交互。

qtest `ps2/prid-split` 用一个小 ROM 验证：两颗 CPU 都从 `0xBFC00000` 开始，EE 读出 PRId `0x2E20`，IOP 读出 `0x1F`，IOP 复位后 SR = `0x00400000`（BEV = 1）；`system_reset` 后两颗 CPU 重新从复位向量执行。

## 15.3 EE 启动

EE 的启动顺序如下，括号或引号中是 QEMU 运行 SCPH-39001 时的串口输出与跟踪记录 <Status s="verified" />：

1. **暂存存储器与栈**：写 TLB 第 0 项，EntryHi = `0x70000000`、EntryLo0 = `0x80000007`（S 位为 1），把 16 KB 暂存存储器映射到虚拟地址 `0x70000000`，栈指针设为 `0x70004000`。此时主存尚未初始化，引导代码只能用暂存存储器作栈（[2.1 节](/chapters/02-memory-map#暂存存储器)）。
2. **测量时钟**：串口输出“# Initialize memory (rev:3.63, ctm:393Mhz, cpuclk:295Mhz detected)”。按 ps2tek，SCPH-39001 用定时器计数 HBLANK 来测量 EE 时钟 <Status s="reference" />。
3. **主存初始化**：InitRDRAM 经 MCH 的 MCH_RICM（`0x1000F430`）与 MCH_DRD（`0x1000F440`）配置 RDRAM，串口输出“# Total accessable memory size: 32 MB”。
4. **EE 内核**：按 ps2tek，内核复制到虚拟地址 `0x80000000` 起，入口为 `0x80001000` <Status s="reference" />。内核设置 TLB（串口输出“# TLB spad=0 kernel=1:12 default=13:30 extended=31:38”），然后依次初始化 GS、INTC、TIMER、DMAC、VU1、VIF1、GIF、VU0、VIF0、IPU、FPU、用户主存与暂存存储器，最后输出“# Initialize Done.”。
5. **DECI2**：串口输出“EE DECI2 Manager version 0.06 … CPUID=2e20, BoardID=0, ROMGEN=2002-0207, 32M”。
6. **SIF 初始化**：写 CTRL、BD6、MAINADDR、MSFLAG，循环读 SMFLAG 等待 IOP（15.5 节）。
7. **EELOAD**：握手完成后加载 EELOAD 并执行。PCSX2 把 EELOAD 的位置记为主存 `0x82000` 起 <Status s="reference" />；QEMU 跟踪中 EELOAD 运行在 `0x83AC0`、`0x84310` 附近。
8. **OSDSYS**：EELOAD 没有参数时加载 `rom0:OSDSYS`（15.6 节）。

## 15.4 IOP 启动与模块加载

IOP 一侧没有单一的内核，内核功能与设备驱动都拆成 IRX 模块（IOP 可重定位 ELF）存放在 ROM0 中。启动顺序如下：

1. **硬件初始化**：IOP 启动代码（跟踪未区分 RESET 与模块）设置 SSBUS 时序（例如 `0x1F801010` = `0x0016244F`）、ICFG、第二组 DMA 与缓存控制（`0xFFFE0130`）<Status s="verified" />。
2. **IOPBOOT**：执行 ROM0 中的 IOPBOOT。PCSX2 在 IOP 跳到 `0xBFC4A000` 时把 a0 改写为 IOP 内存的 MB 数，由此可知该地址是 IOPBOOT 的入口，a0 是内存大小参数 <Status s="reference" />。
3. **SYSMEM 与 LOADCORE**：按 ps2tek，IOPBOOT 在 ROMDIR 中找到 SYSMEM 与 LOADCORE，载入 IOP 内存并执行其入口 <Status s="reference" />。
4. **IOPBTCONF**：IOPBTCONF 是文本文件，每行一个模块名。LOADCORE 按其顺序在 ROMDIR 中查找各模块，重定位、链接导入表后执行其入口，第一个是 EXCEPMAN <Status s="reference" />。
5. **SIF 握手**：加载过程中 SIF 相关模块完成与 EE 的握手（15.5 节）<Status s="verified" />。
6. **EECONF**：读取 CDVD NVM 中的配置，跟踪中可见 S 命令 `0x40`（打开配置区）2 次、`0x41`（读）6 次、`0x43`（关闭）2 次（[第 13 章](/chapters/13-cdvd)）<Status s="verified" />。
7. **加载结束**：全部模块加载完成后，IOP 再次置位 SMFLAG.BOOTEND（ps2sdk 中由 EESYNC 模块完成），各驱动模块注册其库。QEMU 中可见 sio2man、padman、mcman、mcserv 等库注册 <Status s="verified" />。此后 IOP 等待 EE 经 SIF 发来命令。

## 15.5 SIF 握手

SIF 握手使用 MSFLAG、SMFLAG 两个标志寄存器的第 16～18 位（SIFINIT、CMDINIT、BOOTEND，[表 11-2](/chapters/11-sif#_11-2-共用寄存器)）。QEMU 运行 SCPH-39001 时的跟踪记录给出如下顺序 <Status s="verified" />：

**表 15-5 Sony BIOS 的 SIF 握手**

| 步骤 | 执行方 | 操作 |
|---|---|---|
| 1 | EE | 写 CTRL = `0x00000100`、BD6 = `0xFF`、MAINADDR = `0x80021080`、MSFLAG = `0x00010000`（SIFINIT），循环读 SMFLAG |
| 2 | IOP | 读 BD6，循环读 MSFLAG，直到 SIFINIT 为 1 |
| 3 | IOP | 写 CTRL = `0x40`、SUBADDR = 0，再写 SMFLAG = `0x00010000`（SIFINIT） |
| 4 | IOP | 写 SUBADDR = `0x00019600`（命令接收缓冲区），再依次向 SMFLAG 写 `0x00040000`（BOOTEND）、`0x00020000`（CMDINIT） |
| 5 | EE | 读到 SMFLAG = `0x00070000`，写 SMFLAG = `0x00040000` 清除 BOOTEND，以便之后等待模块加载结束 |
| 6 | EE → IOP | SIF1：EE DMAC 通道 6 发送 8 个字，IOP DMA 通道 10 写到 IOP 内存 `0x019600` |
| 7 | IOP → EE | SIF0：IOP DMA 通道 9 发送 6 个字，EE DMAC 通道 5 写到主存 `0x019870` |
| 8 | IOP | 模块加载结束后再次置位 BOOTEND（15.4 节第 7 步） |

::: tip
SMFLAG 中三个标志的置位顺序以上述跟踪为准，即 SIFINIT → BOOTEND → CMDINIT。QEMU 建模记录的摘要按 SIFINIT → CMDINIT → BOOTEND 列出，是概括写法，不是观测到的顺序。EE 等到三位都为 1 时才继续，因此两种顺序对 EE 没有区别。
:::

ps2-lite-bios 的握手与此不同：IOP 先等待 EE 清除上一次引导留下的 SIFINIT 与 CMDINIT，预先启动 SIF1 接收通道，写 SUBADDR，再一次写 SMFLAG = `0x00030000`（SIFINIT | CMDINIT），最后写 SMFLAG = `0x00040000`（BOOTEND）。详细过程与 Linux 一侧的 `sif_init` 见 [11.7.1 节](/chapters/11-sif#_11-7-1-引导握手)。

## 15.6 OSDSYS

OSDSYS 是 ROM0 中的 EE 程序，负责显示开机画面与主菜单（浏览器与系统设置）。按 PCSX2 的说明，EELOAD 第一次被调用且没有参数时运行 `rom0:OSDSYS`；OSDSYS 启动游戏时再以 `EELOAD rom0:PS2LOGO <游戏 ELF>` 的形式调用 EELOAD <Status s="reference" />。

QEMU 中没有光盘，OSDSYS 停在主菜单。图 15-3 是 QEMU 运行 SCPH-39001 时 OSDSYS 画出的主菜单，图 15-4 是 PCSX2 运行同一 BIOS 的画面 <Status s="verified" />。

![图 15-3 QEMU 中的 OSDSYS 主菜单](/img/fig15-3-osdsys-qemu.png)

![图 15-4 PCSX2 中的 OSDSYS 主菜单](/img/fig15-4-osdsys-pcsx2.png)

两幅 640 × 448 的画面按区域比较，结果见表 15-6：各区域的边框位置相差不超过 2 个像素；除背景动画区域外，平均像素差为 1.79（整帧为 2.73，取值范围 0～255）。

**表 15-6 OSDSYS 画面比较（像素坐标：左、上、右、下）**

| 区域 | QEMU | PCSX2 | 结果 |
|---|---|---|---|
| Browser 框 | 374, 200, 489, 221 | 375, 201, 488, 221 | 一致 |
| System Configuration 框 | 280, 232, 585, 257 | 280, 232, 584, 257 | 一致 |
| 按钮行 | 244, 402, 615, 417 | 244, 403, 616, 419 | 一致 |
| 版本号框 | 506, 404, 520, 415 | 506, 404, 520, 416 | 一致 |

## 15.7 QEMU 的两条启动路径

QEMU `-M ps2` 机型只用 `-kernel` 选择启动内容，不读取 `-bios` 与 `-append`。板级函数 `ps2_load_rom0` 按文件内容选择路径：

**表 15-7 `-kernel` 的处理**

| `-kernel` 文件 | ROM0 | 主存 | 启动过程 | 可信度 |
|---|---|---|---|---|
| PS2 BIOS 映像（ROMDIR 以 RESET 开始，并能找到 ROMVER） | BIOS 映像；超过 4 MB 时只用前 4 MB | 空 | 两颗 CPU 运行 Sony BIOS，直到 OSDSYS 主菜单 | <Status s="verified" /> |
| ELF 文件（Linux 内核） | ps2-lite-bios，头部写入内核入口 | 载入 ELF | 两颗 CPU 运行 ps2-lite-bios，EE 等到 BOOTEND 后跳到内核 | <Status s="verified" /> |
| 其他文件 | — | — | 报错“is neither a PS2 BIOS image nor an ELF kernel”并退出 | <Status s="verified" /> |
| 不给 `-kernel` | 全 0 | 空 | 不能启动，仅供 QOM 与 HMP 测试 | <Status s="verified" /> |

两条路径都运行真实的 R3000A 代码，SIF 中没有代替 IOP 应答的高层模拟；复位与 PRId 分流相同（15.2 节）。

### 15.7.1 Sony BIOS 路径

```
qemu-system-mips64el -M ps2 -kernel scph39001.bin
```

板级代码先检查文件开头是否为 ELF 魔数，不是时按 15.1.2 节的规则遍历 ROMDIR：找到以 `RESET` 为名的项，逐项累加按 16 字节取整的文件大小，直到遇到 `ROMVER` 且其 14 个字符位于映像之内。满足条件时 ROM0 保持文件原样。

此路径下 CDVD 的 NVM 与 MechaCon 版本文件默认取自 BIOS 文件旁同名的 `.NVM`、`.MEC` 文件（先找大写扩展名，再找小写），也可用机器属性指定（表 15-9）。

### 15.7.2 ps2-lite-bios 与 Linux 路径

```
qemu-system-mips64el -M ps2 -kernel vmlinux
```

`-kernel` 给出 ELF 文件时，板级代码：

1. 清除已读入 ROM0 的 ELF 内容，载入 `ps2-lite-bios.bin`（或 `litebios=` 属性给出的文件）；
2. 检查其头部：ROM0 偏移 `0x40` 为魔数 `0x4C325350`（"PS2L"），`0x44` 为版本 1，且有含 ROMVER 的 ROMDIR，否则报错退出；
3. 用 `load_elf` 按小端、EM_MIPS 载入内核，KSEG0 地址换算为物理地址；
4. 把内核入口写入 ROM0 偏移 `0x48`（`ee_entry`）；
5. 把 CDVD 设备的 `machine-name` 设为 `SCPH-50004`。

ps2-lite-bios 是本项目编写的小型 ROM0 映像，源码在 QEMU 源码树的 `pc-bios/ps2-lite-bios/`，预编译文件约 23 KB（上限 32 KB，由链接脚本检查）。它不含 Sony 代码，只实现 Linux 所需的 IOP 功能。其 ROM0 布局见表 15-8。

**表 15-8 ps2-lite-bios 的 ROM0 布局**

| 偏移 | 内容 |
|---|---|
| `0x0000` | RESET：读 PRId，小于 `0x100` 转 `iop_start`，否则转 `ee_start` |
| `0x0040`～`0x004F` | 头部：魔数、版本、`ee_entry`（由板级代码写入） |
| `0x0180`～`0x0400` | 各异常向量处只有原地循环 |
| `0x0800` | `ee_start`：SR = `0x10410000`，循环读 SMFLAG（`0xB000F230`）等待 BOOTEND，然后跳到 `ee_entry` |
| `0x2000` | `iop_start`：把 IOP 内核复制到 IOP 内存 `0x1000`，清 BSS，安装异常入口 |
| RESET 之后（16 字节对齐） | ROMDIR：RESET、ROMDIR、EXTINFO（大小 0）、ROMVER、IOPKERN、ADDDRV 与结束项 |

IOPKERN 是名为“IOP_lite_kernel”的 IRX 外壳，导出表声明 loadcore、intrman、sifman、sifcmd、thbase、thsemap 六个库，供 Linux 按 ROMDIR 查找；ADDDRV 是不含代码的“Add_file_driver”。

IOP 内核依次初始化中断管理、堆、定时报警与空闲线程、IRX 链接器与 SIF，注册 HEAP（`0x80000003`）与 LOADFILE（`0x80000006`）两个 RPC 服务器，然后完成 SIF 握手（15.5 节）。EE 跳到 Linux 入口后，Linux 的 `sif_init` 发 RESET_CMD 使 IOP 重新引导，再发 INIT_CMD 建立命令层与 RPC 层；之后 Linux 经 LOADFILE 把 6 个 IRX 模块送到 IOP，由 ps2-lite-bios 的链接器重定位并在真实的 R3000A 上运行。启动时 Linux 输出的“sif: Failed to patch IOP with -2”是因为 ROM0 中没有 MODLOAD，不影响运行。

已经验证的 Linux 工作负载：进入 shell，运行 ps2gl-cubes 与 Descent，用 `modprobe gamepad` 加载 gamepad.irx <Status s="verified" />。

### 15.7.3 机器属性

**表 15-9 `-M ps2` 的机器属性**

| 属性 | 含义 | 可信度 |
|---|---|---|
| `nvm=<文件>` | CDVD NVM 映像，必须为 1024 字节；BIOS 路径下默认取 BIOS 旁的 `.NVM` 文件 | <Status s="verified" /> |
| `mec=<文件>` | MechaCon 版本文件，必须为 4 字节；BIOS 路径下默认取 BIOS 旁的 `.MEC` 文件 | <Status s="verified" /> |
| `litebios=<文件>` | 替代 `ps2-lite-bios.bin` 的 ROM0 映像，只在 `-kernel` 为 ELF 时使用；与 BIOS 映像同用或不给 `-kernel` 时给出警告并忽略（警告并忽略的行为：QEMU 已实现，但没有测试覆盖） | <Status s="verified" /> |

给出 `-initrd` 时只输出警告并忽略，因为内核没有途径找到它。QEMU 已实现，但没有测试覆盖 <Status s="reference" />。NVM 的写入不回存到主机文件。

## 15.8 QEMU 模型说明

启动相关的板级代码在 `hw/mips/ps2.c`（`ps2_find_romver`、`ps2_load_lite_bios`、`ps2_load_rom0`、`ps2_init_cdvd`）。两颗 CPU 分别属于 `ps2-ee`（`hw/mips/ps2_ee.c`）与 `ps2-iop`（`hw/mips/ps2_iop.c`）片上系统，各在一个 CPU 簇中运行。

**表 15-10 启动步骤的验证情况**

| 步骤 | 依据 | 可信度 |
|---|---|---|
| 两颗 CPU 从 `0xBFC00000` 开始，按 PRId 分流 | qtest `ps2/prid-split`；Sony BIOS 与 Linux 启动 | <Status s="verified" /> |
| ROM0 加载、ROMDIR 与 ROMVER 识别、4 MB 截断、错误输入 | qtest `ps2/boot/bios`、`ps2/boot/bios-large`、`ps2/boot/none`、`ps2/boot/bad`、`ps2/boot/no-romver` | <Status s="verified" /> |
| ps2-lite-bios 头部、ROMDIR、IRX 外壳、`ee_entry` | qtest `ps2/rom`、`ps2/boot/elf`、`ps2/boot/lite-bios-wait`、`ps2/boot/lite-bios-bad` | <Status s="verified" /> |
| ROMVER 与机器属性传给 CDVD | qtest `ps2/cdvd/files`、`ps2/cdvd/elf` | <Status s="verified" /> |
| EE 早期初始化（暂存存储器栈、RDRAM、内核初始化） | Sony BIOS 串口输出与跟踪记录 | <Status s="verified" /> |
| IOP 硬件初始化、模块加载、EECONF | Sony BIOS 跟踪记录 | <Status s="verified" /> |
| SIF 握手与 SIF DMA | Sony BIOS 跟踪记录；qtest `ps2/lite-bios/sif` | <Status s="verified" /> |
| OSDSYS 主菜单 | 与 PCSX2 的画面比较（15.6 节） | <Status s="verified" /> |
| Linux 经 LOADFILE 加载 IRX | qtest `ps2/lite-bios/irx`；Linux 启动 | <Status s="verified" /> |
| IOPBOOT 入口 `0xBFC4A000`、EELOAD 位置、Sony BIOS 的 PRId 界限 `0x59`、IOPBOOT 与 LOADCORE 的分工 | 仅依据 PCSX2 与 ps2tek | <Status s="reference" /> |

未模拟或与硬件不同：

| 项目 | 说明 |
|---|---|
| ROM1、ROM2 | 窗口存在但内容为 0，DVD 播放器与中文字库不可用 |
| 光盘 | CDVD 没有光盘，OSDSYS 停在主菜单，不能启动游戏或 PS1 程序 |
| 声音模块 | Sony BIOS 路径下 LIBSD、OSDSND 在 100 s 内没有加载，主菜单没有声音 |
| IOP 缓存控制 | `0xFFFE0130` 是未实现窗口，BIOS 的写入只产生 LOG_UNIMP 记录 |
| 存储卡与手柄 | SIO2 上没有设备，OSDSYS 中无法浏览存储卡，也无法用手柄操作 |
| ps2-lite-bios | 没有 MODLOAD；IOP 空闲线程忙等，在 `thread=single` 下占用 EE 的执行时间 |
| 迁移 | `-M ps2` 的迁移数据目前不能载入（GS 的 `post_load` 检查问题，见[附录 D](/appendix/known-gaps)） |

## 15.9 来源

- QEMU `hw/mips/ps2.c`（`PS2RomDirEntry`、`ps2_find_romver`、`ps2_load_lite_bios`、`ps2_load_rom0`、机器属性）、`pc-bios/ps2-lite-bios/reset.S`、`romdir.S`、`lite-bios.lds`、`lite-bios.h`、`ee.S`、`iop_entry.S`、`iop_kernel.c`、`sif.c`、`services.c`、`irx.c`；`target/mips/cpu-defs.c.inc`（R3000A 的 PRId）；`tests/qtest/ps2-test.c`（`ps2/prid-split`、`ps2/rom`、`ps2/boot/*`、`ps2/lite-bios/*`、`ps2/cdvd/files`、`ps2/cdvd/elf`）
- QEMU 建模记录：Sony BIOS 的串口输出与跟踪记录（第 2～17 轮）、ps2-lite-bios（第 18～21 轮）、OSDSYS 画面比较（第 25 轮）
- PCSX2 pcsx2/ps2/BiosTools.cpp:18–35（ROMDIR 项）、pcsx2/ps2/BiosTools.cpp:80–130（ROMDIR 遍历与 16 字节对齐）、pcsx2/ps2/BiosTools.cpp:136–180（ROMVER 的区域、版本、日期与机型类别）、pcsx2/R3000AInterpreter.cpp:252–255（IOPBOOT 入口与内存大小参数）、pcsx2/R5900.h:296–297（EELOAD 位置）、pcsx2/R5900.cpp:53、pcsx2/R5900.cpp:660–663（EELOAD、OSDSYS 与 PS2LOGO）
- ps2sdk iop/fs/romdrv/include/romdrv.h:17–44（ROM 文件系统组织、ROMDIR 项）、iop/fs/romdrv/include/romdrv.h:54–66（EXTINFO 字段）、iop/fs/romdrv/src/romdrv.c:306（以 RESET 识别映像）、iop/fs/romdrv/src/romdrv.c:347–356（文件与附加信息的定位）、iop/system/eesync/src/eesync.c:39（BOOTEND）
- ps2tek §BIOS File Structure、§BIOS Boot Process
