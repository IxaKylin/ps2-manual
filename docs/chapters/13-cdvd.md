# 第 13 章 CDVD 与 MechaCon

CDVD 子系统负责 PS2 的光驱：读取 CD-ROM、单层与双层 DVD，并兼容 PS1 光盘。它挂在 IOP 一侧，IOP 程序（通常是 IOP 内核模块 cdvdman）经 `0x1F402000` 起的一组 8 位寄存器向它发命令。除了光驱本身，这组寄存器还通向机芯控制器 **MechaCon**，它是一块独立的微控制器，管理托盘、实时时钟（RTC）、1 KB 的 NVM（EEPROM）、型号与 i.LINK ID 等机器参数，以及 MagicGate 认证。BIOS 即使不读光盘，也要经 MechaCon 读时钟和 NVM 中的系统设置。

## 13.1 概述

### 13.1.1 结构

图 13-1 是 CDVD 子系统的结构。IOP 一侧只看到一组寄存器，寄存器后面是两个执行单元：

- **MechaCon**：机芯控制器，执行 **S 命令**（同步命令）。S 命令包括读写 RTC、读写 NVM、托盘控制、读型号和 i.LINK ID、读 MechaCon 版本、MagicGate 认证等。
- **DSP 与光驱机构**：执行 **N 命令**（异步命令），即寻道、读扇区、读 TOC 等需要光盘的操作。读出的扇区数据经 IOP DMA 通道 3 送入 IOP 内存，命令结束时向 IOP INTC 申请中断。

![图 13-1 CDVD 子系统](/img/fig13-1-cdvd.svg)

主要特性：

- 8 位寄存器窗口，IOP 物理地址 `0x1F402000`–`0x1F4020FF`；EE 经 SBUS 窗口在同一物理地址访问（KSEG1 为 `0xBF402000`，第 2 章）。
- N 命令与 S 命令各有一个 16 字节参数 FIFO；S 命令另有 16 字节结果缓冲区。
- N 命令结束、托盘打开等事件经 CDVD_I_STAT 汇总，接到 IOP INTC 第 2 号中断源。
- MechaCon 带 BCD 格式的 RTC 和 1 KB NVM。NVM 按 16 位字访问，其中有 3 个按 16 字节块访问的配置区。

### 13.1.2 QEMU 中的范围

QEMU 的 `ps2-cdvd` 设备模拟寄存器接口和 MechaCon 的大部分 S 命令，**不模拟光盘**：托盘复位后关闭且没有光盘，除 NOP 以外的 N 命令都以“没有光盘”错误结束，IOP DMA 通道 3 没有外设。NVM、RTC 和 MechaCon 版本可以由机器属性指定（13.11 节）。Sony BIOS 在 QEMU 中启动到 OSDSYS 菜单的过程中，EECONF 发出配置区 S 命令 0x40/0x41/0x43；寄存器与表 13-2、13-3 中标为 verified 的其余命令由 qtest `ps2/cdvd/ncmd`、`ps2/cdvd/scmd`、`ps2/cdvd/elf`、`ps2/cdvd/files` 覆盖。

## 13.2 命令协议

### 13.2.1 N 命令

N 命令是异步的：发出后立即返回，命令在光驱中执行，结束时以中断通知。步骤如下：

1. 读 N_READY（`0x1F402005`），等待第 7:6 位为 `0b01`（READY = 1，BUSY = 0）。cdvdman 在发命令前做的就是这个检查。
2. 向 N_PARAM（写 `0x1F402005`）依次写入参数字节，多字节参数为小端序。
3. 写 N_COMMAND（`0x1F402004`）= 命令码，命令开始执行。
4. 命令结束时 CDVD_I_STAT.DONE 置 1，并向 IOP INTC 第 2 号中断源申请中断。
5. 中断处理程序读 N_READY.ERROR；为 1 时读 ERROR（`0x1F402006`）取得错误码，读出后 ERROR 自动清零。
6. 向 CDVD_I_STAT 写 1 清除 DONE，再清 IOP INTC I_STAT 的第 2 位。

需要传数据的命令（读扇区、读 TOC）在发命令前还要设置 IOP DMA 通道 3 与 HOWTO 寄存器，数据随读随送。驱动器未就绪时写入的命令不会被接受，ERROR 置为 0x13，但仍然产生 DONE 中断。

### 13.2.2 S 命令

S 命令是同步的，由 MechaCon 执行，不产生中断：

1. 读 S_STATUS（`0x1F402017`）。cdvdman 在 BUSY（第 7 位）为 1 时直接按异常结束处理，否则一直等到 EMPTY（第 6 位）为 1，不读出残留结果。建议在 EMPTY 为 0 时先把 S_RESULT 中的残留结果读空；这是推荐步骤，不是 cdvdman 的行为。
2. 向 S_PARAM（写 `0x1F402017`）依次写入参数字节。
3. 写 S_COMMAND（`0x1F402016`）= 命令码。
4. 等待 S_STATUS.BUSY 变为 0。
5. 在 S_STATUS.EMPTY 为 0 期间反复读 S_RESULT（`0x1F402018`），每次得到一个结果字节。多数命令的第 1 个结果字节是状态，0 表示成功。

::: tip
QEMU 在写 S_COMMAND 时立即算出全部结果，S_STATUS.BUSY 恒为 0，第 4 步不会等待。结果读完后 S_STATUS 读出为 `0x40`，再读 S_RESULT 得到 0。
:::

## 13.3 N 命令

表 13-1 中的参数字节数取自 ps2sdk cdvdman 发命令时的参数长度，名称取自 PCSX2 与 ps2tek。读扇区命令的参数布局为：第 0–3 字节扇区号，第 4–7 字节扇区数，第 10 字节块大小（CD 读取时 1 为 2328 字节，2 为 2340 字节，其他值为 2048 字节；ps2tek）。

**表 13-1 N 命令**

| 命令码 | 名称 | 参数字节数 | 说明 | QEMU |
|---|---|---|---|---|
| `0x00` | NOP | 0 | 不做任何事，结束时产生中断 | <Status s="verified" /> 立即完成；带参数时错误 0x22 |
| `0x01` | NOP（同步）/ Reset | 0 | 两种来源命名不同 | <Status s="unimplemented" /> 错误 0x12 |
| `0x02` | Standby | 0 | 读位置回到扇区 0，进入暂停 | <Status s="unimplemented" /> 错误 0x12 |
| `0x03` | Stop | 0 | 读位置回到扇区 0，主轴停转 | <Status s="unimplemented" /> 错误 0x12 |
| `0x04` | Pause | 0 | 暂停 | <Status s="unimplemented" /> 错误 0x12 |
| `0x05` | Seek | 4 | 寻道到指定扇区 | <Status s="unimplemented" /> 错误 0x12 |
| `0x06` | ReadCd | 11 | CD 方式读扇区，数据经 DMA 通道 3 | <Status s="unimplemented" /> 错误 0x12（qtest 检查） |
| `0x07` | ReadCdda | 11 | 读 CD-DA 音轨 | <Status s="unimplemented" /> 错误 0x12 |
| `0x08` | ReadDvd | 11 | DVD 方式读扇区，每块 2064 字节 | <Status s="unimplemented" /> 错误 0x12 |
| `0x09` | GetToc | 1 | 读 TOC | <Status s="unimplemented" /> 错误 0x12 |
| `0x0B` | — | 1 | 用途不明（PCSX2 称 NCMD_B） | <Status s="unimplemented" /> 错误 0x12 |
| `0x0C` | ReadKey | 7 | 读光盘密钥，结果在 KEY 寄存器 | <Status s="unimplemented" /> 错误 0x12 |
| `0x0E` | ReadXCdda | 11 | 读 CD-DA（扩展） | <Status s="unimplemented" /> 错误 0x12 |
| `0x0F` | ChgSpdlCtrl | 1 | 改变主轴速度控制 | <Status s="unimplemented" /> 错误 0x12 |

QEMU 不区分命令码：驱动器就绪时，0x00 以外的任何值都以错误 0x12（没有光盘）结束，N_COMMAND 读出该命令码。

来源：PCSX2 pcsx2/CDVD/CDVD_internal.h:183–198（命令码）；ps2sdk iop/cdvd/cdvdman/src/cdvdman.c:6172–6283、6342、6553、7109、7170、7251、7261、8201（各命令的参数长度）；ps2tek §CDVD N Commands。

## 13.4 S 命令

表 13-2 的“参数:结果”是参数字节数与结果字节数，取自 PCSX2 `pcsx2/CDVD/CDVD.cpp` 中各命令的注释和结果长度；“行”是该命令在此文件中的行号。QEMU 一列：<Status s="verified" /> 为已实现且有 qtest 或 BIOS 启动覆盖，<Status s="reference" /> 为 QEMU 已实现，但没有测试覆盖，<Status s="unimplemented" /> 为 QEMU 返回 1 字节 `0x80`（错误）并记录 LOG_UNIMP。

**表 13-2 S 命令**

| 命令码 | 功能 | 参数:结果 | QEMU 行为 | QEMU | 行 |
|---|---|---|---|---|---|
| `0x02` | 读 Q 子通道 | 0:11 | 11 字节，首字节 0x80（无光盘） | <Status s="verified" /> | 2440 |
| `0x03` | MechaCon 子命令，第 1 个参数为子命令码 | 见表 13-3 | 见表 13-3 | 见表 13-3 | 2445 |
| `0x05` | 托盘状态复查：把 STATUS 的托盘位装入 STICKY | 0:1 | 结果 0 | <Status s="verified" /> | 2494 |
| `0x06` | 托盘控制，参数 0 打开、1 关闭 | 1:1 | 打开时置 CDVD_I_STAT.EJECT；重复操作返回 0x80 | <Status s="verified" /> | 2503 |
| `0x08` | 读 RTC | 0:8 | 见 13.6 节 | <Status s="verified" /> | 2512 |
| `0x09` | 写 RTC | 7:1 | 取最后 7 个参数；不足 7 个返回 0x80 | <Status s="verified" /> | 2528 |
| `0x0A` | 读 NVM 一个字 | 2:3 | 字地址 ≥ 0x200 返回 1 字节 0xFF | <Status s="verified" /> | 2546 |
| `0x0B` | 写 NVM 一个字 | 4:1 | 字地址越界时同上 | <Status s="verified" /> | 2565 |
| `0x0F` | 关机 | 0:1 | 结果 0，并请求 QEMU 关机 | <Status s="reference" /> | 2587 |
| `0x12` | 读 i.LINK ID | 0:9 | NVM 中 ID 的第 3、4 字节（ID[2]、ID[3]）都为 0 时返回默认 ID | <Status s="verified" /> | 2592 |
| `0x13` | 写 i.LINK ID | 8:1 | 从第 2 个参数字节起取 8 字节写入 NVM | <Status s="reference" /> | 2609 |
| `0x14` | 数字音频输出控制 | 1:1 | 结果 0 | <Status s="reference" /> | 2614 |
| `0x15` | 禁止 DVD 播放器（ForbidDVDP） | 0:1 | 结果 5 | <Status s="verified" /> | 2620 |
| `0x16` | 自动调整控制 | 1:1 | 结果 0 | <Status s="reference" /> | 2626 |
| `0x17` | 读型号，参数为字节偏移（0 或 8） | 1:9 | 从 NVM 型号区读 8 字节 | <Status s="verified" /> | 2631 |
| `0x18` | 写型号 | 9:1 | 写 8 字节 | <Status s="reference" /> | 2636 |
| `0x1A` | 引导认证（BootCertify），参数取自 ROMVER | 4:1 | 结果 1 | <Status s="reference" /> | 2644 |
| `0x1B` | 取消关机就绪 | 0:1 | 结果 0 | <Status s="reference" /> | 2649 |
| `0x1C` | 蓝色 LED 控制 | 1:1 | 结果 0 | <Status s="reference" /> | 2654 |
| `0x1E` | 读遥控器按键 | 0:5 | `00 14 00 00 00` | <Status s="reference" /> | 2662 |
| `0x20` | 遥控器状态 | 0:3 | `00 01 00` | <Status s="reference" /> | 2674 |
| `0x22` | 读唤醒时间 | 0:10 | 全 0 | <Status s="reference" /> | 2684 |
| `0x24` | 遥控器旁路控制 | 1:1 | 结果 0 | <Status s="reference" /> | 2698 |
| `0x27` | 读 PS1 引导参数（中国区机型） | 0:13 | 0x80 | <Status s="unimplemented" /> | 2710 |
| `0x29` | 游戏启动通知 | 1:1 | 结果 0 | <Status s="reference" /> | 2735 |
| `0x31` | 设置禁止取出光盘 | 1:1 | 结果 0 | <Status s="reference" /> | 2755 |
| `0x32` | 读禁止取出光盘状态 | 0:2 | 全 0 | <Status s="reference" /> | 2760 |
| `0x36` | 读区域参数（PStwo） | 0:15 | 0x80 | <Status s="unimplemented" /> | 2769 |
| `0x37` | 读 MAC 值（PStwo，EECONF 调用） | 0:9 | 0x80 | <Status s="unimplemented" /> | 2793 |
| `0x38` | 写 MAC 值 | 8:1 | 0x80 | <Status s="unimplemented" /> | 2798 |
| `0x3E` | 写区域参数 | 15:1 | 0x80 | <Status s="unimplemented" /> | 2803 |
| `0x40` | 打开配置区 | 3:1 | 见 13.5.2 节 | <Status s="verified" /> | 2808 |
| `0x41` | 读配置块 | 0:16 | 见 13.5.2 节 | <Status s="verified" /> | 2817 |
| `0x42` | 写配置块 | 16:1 | 见 13.5.2 节 | <Status s="verified" /> | 2822 |
| `0x43` | 关闭配置区 | 0:1 | 结果 0 | <Status s="verified" /> | 2827 |
| `0x80`–`0x97` | MagicGate 认证与解密（secrman、sceMg 系列） | 各不相同 | 0x80 | <Status s="unimplemented" /> | 2836 |
| 其他 | — | — | 0x80 | <Status s="verified" /> | — |

**表 13-3 S 命令 0x03 的子命令**

| 子命令 | 功能 | 参数:结果 | QEMU 行为 | QEMU |
|---|---|---|---|---|
| `0x00` | 读 MechaCon 版本 | 1:4 | 4 字节，小端序；默认 `0x00020603`（结果 `03 06 02 00`），可由 MEC 文件替换 | <Status s="verified" /> |
| `0x30` | 读驱动器状态 | 2:2 | QEMU 忽略第 2 个参数字节（cdvdman 写 2）；第 1 字节为 STATUS，第 2 字节托盘打开时为 8，否则为 0 | <Status s="verified" /> |
| `0x44` | 写 Console ID | 9:1 | 第 2–9 个参数字节写入 NVM | <Status s="reference" /> |
| `0x45` | 读 Console ID | 1:9 | 从 NVM 读 8 字节 | <Status s="reference" /> |
| `0xEF` | 读机内温度 | 1:3 | `00 0F 05`（30.5 °C） | <Status s="reference" /> |
| `0xFD` | 读更新日期（BCD） | 1:6 | `00 04 12 10 01 30`（2004-12-10 01:30） | <Status s="reference" /> |
| 其他 | — | 1:1 | `0x81` | <Status s="verified" /> |

来源：PCSX2 pcsx2/CDVD/CDVD.cpp:2445–2491（子命令）；ps2sdk iop/cdvd/cdvdman/src/cdvdman.c:7357–7439（读写 Console ID、版本、更新日期）、7802–7816（温度）；ps2tek §CDVD S Commands。

真实硬件上的区域参数由 MechaCon 保存，PStwo 经 S 命令 0x36 读取；QEMU 不实现 0x36，BIOS 区域只体现在默认 NVM 的语言设置上（13.11.2 节）。

## 13.5 NVM

### 13.5.1 布局

NVM 是 MechaCon 管理的 1 KB EEPROM，存放系统设置、i.LINK ID、Console ID 和机器型号。S 命令 0x0A/0x0B 按 16 位字访问：参数前 2 字节是字地址（高字节在前，0–0x1FF），写命令随后 2 字节是数据（高字节在前），读命令的结果第 2、3 字节是数据（高字节在前）。数据在 NVM 中按小端序存放，即字地址 n 对应字节偏移 2n（低字节）与 2n + 1（高字节）。

各字段的位置随 BIOS 版本变化：BIOS 1.70 起使用另一种布局（表 13-4）。

**表 13-4 NVM 字段的字节偏移**

| 字段 | BIOS < 1.70 | BIOS ≥ 1.70 | 大小 | 访问方式 |
|---|---|---|---|---|
| 配置区 0 | `0x280` | `0x270` | 4 块 × 16 字节 | S 命令 0x40–0x43，区号 0 |
| 配置区 1 | `0x300` | `0x2B0` | 2 块 × 16 字节 | 区号 1 |
| 配置区 2 | `0x200` | `0x200` | 7 块 × 16 字节 | 区号 2 |
| 型号 | `0x1A0` | `0x1B0` | 16 字节（ASCII，例如 `SCPH-39001`） | S 命令 0x17/0x18 |
| i.LINK ID | `0x1C0` | `0x1E0` | 8 字节 | S 命令 0x12/0x13 |
| Console ID | `0x1C8` | `0x1F0` | 8 字节 | S 命令 0x03:0x44/0x45 |

PCSX2 的布局表还列出 PStwo 的区域参数（`0x180`）和 MAC 值（`0x198`），QEMU 不使用。配置区内各字节的含义没有可靠的公开来源，本手册不列出。

来源：QEMU hw/misc/ps2_cdvd.c:36–61；PCSX2 pcsx2/CDVD/CDVD_internal.h:246–264、pcsx2/CDVD/CDVD.cpp:319–390；ps2sdk iop/cdvd/cdvdman/src/cdvdman.c:7976–8000。

### 13.5.2 配置区访问

配置区按 16 字节块访问：

1. S 命令 0x40（打开配置区），3 个参数：模式（0 读，1 写）、区号、块数。
2. 读模式下每发一次 S 命令 0x41，得到下一块的 16 字节；写模式下每发一次 S 命令 0x42（16 个参数字节），写入下一块。
3. S 命令 0x43 关闭配置区。

QEMU 的规则：块序号达到打开时给出的块数，或超过该区的块数（4、2、7）后，0x41 返回全 0、0x42 不写入；写模式下发 0x41 返回首字节 0x80；读模式下发 0x42 不写入。区号 3 及以上按区 1 的地址访问，且不检查块数上限；区 1 本身仍限 2 块。

## 13.6 RTC

MechaCon 内有一个实时时钟，时间以 **BCD** 码表示，按日本标准时间（JST，UTC+9）计时。S 命令 0x08 的 8 字节结果如表 13-5，与 ps2sdk 的 `sceCdCLOCK` 结构顺序一致。

**表 13-5 RTC 结果格式（S 命令 0x08）**

| 字节 | 内容 | 示例 |
|---|---|---|
| 0 | 状态，0 表示成功 | `0x00` |
| 1 | 秒（BCD） | `0x59` |
| 2 | 分（BCD） | `0x30` |
| 3 | 时（BCD，24 小时制） | `0x21` |
| 4 | 0（填充） | `0x00` |
| 5 | 日（BCD） | `0x10` |
| 6 | 月（BCD，1–12） | `0x11` |
| 7 | 年（BCD，2000 年起的后两位） | `0x26` |

cdvdman 读时钟后把月份字节的第 7 位清零。写时钟用 S 命令 0x09，参数顺序同结果的第 1–7 字节（秒、分、时、忽略、日、月、年）；ps2tek 记载为 8 个参数，第 0 个忽略。

QEMU 的 RTC 为主机时钟加上一个偏移再加 9 小时。写 RTC 时 QEMU 取最后 7 个参数字节，分按 60、时按 24 取模，月忽略第 7 位，然后重新计算偏移；偏移在系统复位后保留，但不写入任何文件，QEMU 重新启动后 RTC 回到主机时间。

来源：QEMU hw/misc/ps2_cdvd.c:230–265；PCSX2 pcsx2/CDVD/CDVD.cpp:40、2512–2544；ps2sdk common/include/libcdvd-common.h:188–206、iop/cdvd/cdvdman/src/cdvdman.c:7934–7973；ps2tek §CDVD S Commands。

## 13.7 中断

CDVD 只有一根中断输出，接 IOP INTC 第 2 号中断源（第 12 章）。中断原因在 CDVD_I_STAT 中：

| 位 | 原因 | QEMU |
|---|---|---|
| 0 | N 命令结束（DONE） | <Status s="verified" /> 每条 N 命令都置位 |
| 1 | 命令完成（ps2tek） | <Status s="unimplemented" /> 不置位 |
| 2 | 电源键（关机请求） | <Status s="unimplemented" /> 不置位 |
| 3 | 托盘打开（EJECT） | <Status s="verified" /> S 命令 0x06 打开托盘时置位 |
| 4 | BS 电源检测 | <Status s="unimplemented" /> 不置位 |

DONE 用第 0 位还是第 1 位，资料说法不一：PCSX2 与 QEMU 用第 0 位，ps2tek 认为 N 命令完成为第 1 位。cdvdman 的中断处理程序检查第 0 位，并在第 2 位为 0 时向第 1 位写 1。

QEMU 只在 CDVD_I_STAT 某一位由 0 变为 1 时向 IOP INTC 发出一个脉冲（IOP INTC 按边沿锁存）。某一位未清除时同一原因再次发生，不会再次申请中断，因此中断处理程序必须写 CDVD_I_STAT 清除已处理的位。

## 13.8 寄存器汇总

地址为 IOP 物理地址，偏移相对于 `0x1F402000`。同一地址读写含义不同的寄存器分两行列出（例如 `0x1F402005` 读为 N_READY、写为 N_PARAM）。没有详细说明的寄存器在 QEMU 中读出常量或忽略写入，汇总表中的说明即全部内容。

<RegSummary block="cdvd" />

## 13.9 寄存器说明

### N_COMMAND
<Reg block="cdvd" name="N_COMMAND" />

### N_READY
<Reg block="cdvd" name="N_READY" />

### N_PARAM
<Reg block="cdvd" name="N_PARAM" />

### ERROR
<Reg block="cdvd" name="ERROR" />

### HOWTO
<Reg block="cdvd" name="HOWTO" />

### BREAK
<Reg block="cdvd" name="BREAK" />

### CDVD_I_STAT
<Reg block="cdvd" name="CDVD_I_STAT" />

### WHERE_SEL
<Reg block="cdvd" name="WHERE_SEL" />

### STATUS
<Reg block="cdvd" name="STATUS" />

### STICKY
<Reg block="cdvd" name="STICKY" />

### TYPE
<Reg block="cdvd" name="TYPE" />

### S_COMMAND
<Reg block="cdvd" name="S_COMMAND" />

### S_STATUS
<Reg block="cdvd" name="S_STATUS" />

### S_PARAM
<Reg block="cdvd" name="S_PARAM" />

### S_RESULT
<Reg block="cdvd" name="S_RESULT" />

### DEC_SET
<Reg block="cdvd" name="DEC_SET" />

## 13.10 编程要点

所有寄存器只能按字节访问。下面的地址为 IOP 物理地址；IOP 程序一般经 KSEG1（`0xBF402000` 起）访问。

### 13.10.1 读 RTC

1. 读 S_STATUS（`0x1F402017`），等待第 7 位为 0；若第 6 位为 0，反复读 S_RESULT 直到第 6 位为 1。
2. 写 S_COMMAND（`0x1F402016`）= `0x08`（无参数）。
3. 等待 S_STATUS 第 7 位为 0。
4. 读 S_RESULT（`0x1F402018`）8 次，按表 13-5 解释；第 0 字节非 0 表示失败。

### 13.10.2 读 NVM 一个字

以读字地址 `0x0140` 为例：

1. 按 13.10.1 节第 1 步等待 S 命令空闲。
2. 写 S_PARAM（`0x1F402017`）= `0x01`，再写 `0x40`（字地址，高字节在前）。
3. 写 S_COMMAND = `0x0A`。
4. 读 S_RESULT 3 次：状态、数据高字节、数据低字节。状态为 `0xFF` 表示地址越界。

写一个字时参数为 4 字节（地址高、地址低、数据高、数据低），命令码 `0x0B`，结果 1 字节。

### 13.10.3 读配置区

以读配置区 1 的前两块为例：

1. 发 S 命令 0x40，参数 `00 01 02`（读模式、区 1、2 块），读 1 字节结果。
2. 发 S 命令 0x41 两次，每次读 16 字节结果。
3. 发 S 命令 0x43，读 1 字节结果。

### 13.10.4 发 N 命令与中断处理

1. 读 N_READY（`0x1F402005`），确认 `(N_READY & 0xC0) == 0x40`。
2. 依次写 N_PARAM（写 `0x1F402005`），再写 N_COMMAND（`0x1F402004`）。
3. 在 IOP INTC 中允许中断源 2。中断处理程序中：
   - 读 CDVD_I_STAT（`0x1F402008`）；
   - 若 DONE 为 1：读 N_READY，ERROR 位为 1 时读 ERROR（`0x1F402006`）得到错误码；
   - 把读到的 CDVD_I_STAT 值写回，清除已处理的位；
   - 清 IOP INTC I_STAT 的第 2 位。

::: warning
在 QEMU 中托盘打开时 N_READY.READY 为 0，此时发出的 N 命令得到错误 0x13（未就绪）。用 S 命令 0x06（参数 1）关闭托盘后恢复就绪。
:::

## 13.11 QEMU 模型说明

### 13.11.1 设备与连接

QEMU 中 CDVD 由 `hw/misc/ps2_cdvd.c` 实现（设备类型 `ps2-cdvd`，QOM 路径 `/machine/cdvd`），由板级代码 `hw/mips/ps2.c` 创建，映射在 IOP 总线 `0x1F402000`，窗口 `0x100` 字节，中断接 IOP INTC 第 2 号输入。寄存器只接受 1 字节访问：2 字节、4 字节访问记录 LOG_GUEST_ERROR，写入被忽略、读出 0。未定义的偏移读出 `0xFF` 并记录 LOG_UNIMP。没有接 DMA，IOP DMA 通道 3 启动后立即结束并记录“没有外设”。

### 13.11.2 机器属性与 ROMVER

| 来源 | 作用 |
|---|---|
| `-M ps2,nvm=<文件>` | NVM 映像，必须正好 1024 字节，否则 QEMU 报错退出 |
| `-M ps2,mec=<文件>` | MechaCon 版本，必须正好 4 字节，按小端序作为 S 命令 0x03:0x00 的结果 |
| BIOS 旁的同名文件 | 用 Sony BIOS 启动且未给出 `nvm`/`mec` 时，依次查找 `<BIOS 主文件名>.NVM`、`.nvm` 与 `.MEC`、`.mec` |
| ROMVER | 板级代码在 BIOS 的 ROMDIR 中找到 ROMVER（14 字节，例如 `0160AC20020207`），前 4 位为数字且第 5 个字符存在时传给设备属性 `romver` |
| `machine-name` | ELF（Linux）启动路径设为 `SCPH-50004`，写入默认 NVM 的型号区 |

`romver` 的前 4 位数字是 BIOS 版本（`0160` 即 1.60），第 5 个字符是区域。设备据此：

- 版本 ≥ 1.70 时使用表 13-4 的新布局，否则使用旧布局；没有 `romver` 时按旧布局、日本区域处理。
- 没有 NVM 文件时生成默认 NVM：写入默认 i.LINK ID `00 AC FF FF FF FF B9 86`（新布局下在 i.LINK ID 起始偏移 +9 处写校验值 `0x18`），按区域在配置区 1 第 2 块写入默认语言设置，设置了 `machine-name` 时写入型号。
- 默认语言设置按区域字符取值：`A`、`E`、`H` 为英语，`C` 为简体中文，`T`、`X`、`P` 不写，其他（包括 `J`）为日语。取值与 PCSX2 的默认表一致（pcsx2/CDVD/CDVD_internal.h:283–296）。

ELF 启动路径使用的 lite-bios 的 ROMVER 为 `0230EC20040614`，即 2.30 版、欧洲区域、新布局。

### 13.11.3 已模拟与未模拟

已模拟：

| 功能 | 说明 |
|---|---|
| 寄存器 | N/S 命令寄存器、参数 FIFO（16 字节，溢出时清空）、S 命令结果缓冲区、ERROR 读清零、CDVD_I_STAT 写 1 清零、STATUS/STICKY、DEC_SET 可读写 |
| 托盘 | 复位时关闭；S 命令 0x06 打开 / 关闭，打开时 READY 为 0 并产生 EJECT 中断 |
| N 命令 | NOP 成功；其他命令立即以错误 0x12 结束；未就绪时错误 0x13 |
| S 命令 | 表 13-2、表 13-3 中标为已实现的命令 |
| NVM | 1 KB，新旧两种布局，系统复位后保留 |
| RTC | 主机时钟 + 偏移，JST，BCD；偏移在系统复位后保留 |
| 迁移 | 全部寄存器状态、NVM 与 RTC 偏移进入 vmstate |

未模拟或与硬件不同：

| 功能 | 说明 |
|---|---|
| 光盘 | 没有光盘映像，TYPE 恒为 0；读扇区、寻道、TOC 等都不实现，DMA 通道 3 没有数据 |
| 忙状态 | N_READY.BUSY 与 S_STATUS.BUSY 恒为 0，命令没有执行时间 |
| 位置与速度 | CRT_MINUTE/CRT_FRAME、SPEED 读 0，CRT_SECOND 读 0x02；WHERE_SEL、PS1_SPEED 写入被忽略 |
| 密钥与解密 | KEY 寄存器读 0；DEC_SET 只保存，不解密 |
| BREAK、HOWTO | BREAK 写入被忽略；HOWTO 只保存 |
| NVM 写回 | 对 NVM 的写入只改内存中的副本，不写回主机文件 |
| 寄存器镜像 | 不模拟 64 KB 范围内的寄存器镜像 |
| PStwo 与 MagicGate | S 命令 0x27、0x36、0x37、0x38、0x3E 与 MagicGate 系列（0x80–0x97）返回 0x80 |
| 中断位 | CDVD_I_STAT 第 1、2、4 位从不置位；DONE 用第 0 位（与 PCSX2 一致，与 ps2tek 不同） |
| 关机 | S 命令 0x0F 除返回结果外还请求 QEMU 关机 |

## 13.12 参考资料

- QEMU `include/hw/misc/ps2_cdvd.h`、`hw/misc/ps2_cdvd.c`、`hw/mips/ps2.c`（`ps2_init_cdvd`、`ps2_find_romver`）；qtest `tests/qtest/ps2-test.c`（`ps2/cdvd/ncmd`、`ps2/cdvd/scmd`、`ps2/cdvd/elf`、`ps2/cdvd/files`）
- PCSX2 pcsx2/CDVD/CDVD.cpp:40（JST 偏移）、:49（默认 MechaCon 版本）、:103–114（中断）、:319–390（配置区）、:1683–1850（寄存器读）、:1909–2411（N 命令与寄存器写）、:2419–3083（S 命令）、:3085–3160（寄存器写）
- PCSX2 pcsx2/CDVD/CDVD_internal.h:45–52（中断原因）、:54–72（STATUS）、:86–94（N_READY）、:183–198（N 命令码）、:246–264（NVM 布局）、:283–296（默认语言设置）
- ps2sdk iop/cdvd/cdvdman/src/cdvdman.c:4272–4320（中断处理）、:5086–5180（S 命令收发）、:5991–6071（N 命令发送）、:7934–8000（RTC 与 NVM 命令）、:8484–8503（打开配置区）；ps2sdk common/include/libcdvd-common.h:188–206（`sceCdCLOCK`）；ps2sdk common/include/dev5_mmio_hwport.h:84（寄存器基地址 `0xBF402000`）
- ps2tek §CDVD I/O Ports、§CDVD N Commands、§CDVD S Commands
