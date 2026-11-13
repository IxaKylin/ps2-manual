# 第 10 章 图像处理单元 IPU

<Status s="unimplemented" /> QEMU 不模拟 IPU。本章根据 PCSX2 源码介绍 IPU 的地址、结构和命令，可在阅读游戏程序或规划后续模型时参考。这些内容未经 QEMU 验证，细节以 PCSX2 与真实硬件为准。

## 10.1 概述

IPU（Image Processing Unit，图像处理单元）是 EE 片上系统中的 MPEG 解码协处理器，挂在 EE 总线上，与 R5900 并行工作。主要用途：

- **播放全动态视频（FMV）**：游戏的片头和过场动画多以 MPEG-2 码流（少数为 MPEG-1）保存在光盘上。IPU 负责解析码流、反量化和反离散余弦变换（IDCT），然后输出宏块图像。
- **图像解压缩**：只用帧内编码（I 图像）压缩的贴图或背景图，经 IPU 解码后可直接得到 RGB 像素，再送往 GS。

IPU 只做宏块级的处理，不做运动补偿。对 P、B 图像，IPU 解出运动矢量后交给程序，由程序（R5900 或 VU）根据参考帧完成预测，再与 IPU 输出的残差相加。整幅图像的组织、码流分离（例如分离 PSS 文件中的音频和视频）、帧缓冲区管理和显示也都由程序完成。

![图 10-1 IPU 结构与数据流](/img/fig10-1-ipu.svg)

### 10.1.1 数据通路

IPU 的数据进出都经过两个 FIFO，每个深 8 个四字（PCSX2 pcsx2/IPU/IPU_Fifo.h:13、:24）：

| 方向 | FIFO 端口 | DMAC 通道 | 通道基地址 | 内容 |
|---|---|---|---|---|
| 主存 → IPU | IPU_in_FIFO `0x10007010` | 4（toIPU），支持普通模式与源链 | `0x1000B400` | MPEG 码流、量化矩阵、VQ 色表、CSC/PACK 的源像素 |
| IPU → 主存 | IPU_out_FIFO `0x10007000` | 3（fromIPU），普通模式 | `0x1000B000` | 解码得到的宏块（RGB32、RGB16、INDX4 或 16 位 YCbCr） |

R5900 也可以用 128 位访问直接读写这两个端口，但实际程序几乎都使用 DMA。DMAC 通道寄存器见第 6 章。

IPU 内部按以下顺序处理码流（图 10-1）：

1. **输入 FIFO**：toIPU DMA 把码流写入输入 FIFO。IPU 每次从 FIFO 取一个四字，放入内部两个四字大小的码流缓冲区；当前位位置见 IPU_BP。
2. **码流解码（VLC）**：解析宏块地址增量、宏块类型、编码块模式（CBP）、运动矢量和 DCT 系数等变长码。
3. **反量化（IQ）**：用帧内（IQ）或非帧内（NIQ）量化矩阵和量化步长恢复 DCT 系数。量化矩阵用 SETIQ 命令装入。
4. **IDCT**：对每个 8×8 块做反变换，得到 YCbCr 4:2:0 宏块（一个 16×16 亮度块、两个 8×8 色度块）。
5. **颜色空间转换（CSC）**：把 YCbCr 转换为 RGB32。需要 16 位输出时再经抖动（dither）转为 RGB16。PACK 命令还可以经矢量量化（VQ）转为 4 位索引（INDX4）。
6. **输出 FIFO**：结果写入输出 FIFO，由 fromIPU DMA 搬到主存。输出 FIFO 满时 IPU 暂停，等 DMA 取走数据后继续。

### 10.1.2 寄存器窗口

| 地址范围 | 内容 | QEMU |
|---|---|---|
| `0x10002000`–`0x10002FFF` | 控制寄存器 IPU_CMD、IPU_CTRL、IPU_BP、IPU_TOP（PCSX2 中读出每 `0x100` 重复一次，写入按 `0xFFF` 屏蔽地址、不重复，pcsx2/IPU/IPU.cpp:222、339、374） | 未实现设备 `ps2.ipu` |
| `0x10007000`–`0x10007FFF` | FIFO 端口 IPU_out_FIFO、IPU_in_FIFO | 未实现设备 `ps2.ipu-fifo` |

窗口地址依据 PCSX2 pcsx2/Hw.h:19–20、:36–37，寄存器地址依据 pcsx2/Hw.h:108–111、:174–175。

## 10.2 命令

程序向 IPU_CMD 写入一个 32 位命令字来启动命令：位 31:28 为命令码，位 27:0 为参数。命令码依据 PCSX2 pcsx2/IPU/IPU.h:215–227 中的枚举；参数位域依据同一文件 :140–213，以及 pcsx2/IPU/IPU.cpp、pcsx2/IPU/IPU_MultiISA.cpp。

**表 10-1 IPU 命令** <Status s="reference" />

| 码 | 名称 | 功能 | 主要参数 | 输出 |
|---|---|---|---|---|
| 0 | BCLR | 清空输入 FIFO，设置码流起始位位置 | 位 6:0 BP | 无，立即结束 |
| 1 | IDEC | 帧内图像解码：连续解码一个片（slice）中的宏块，并做颜色空间转换 | 位 5:0 FB，位 20:16 QSC，位 24 DTD，位 25 SGN，位 26 DTE，位 27 OFM | RGB32（OFM = 0）或 RGB16（OFM = 1） |
| 2 | BDEC | 块解码：解码一个宏块，不做颜色空间转换 | 位 5:0 FB，位 20:16 QSC，位 25 DT，位 26 DCR，位 27 MBI | 16 位有符号 YCbCr 宏块（48 个四字） |
| 3 | VDEC | 解码一个变长码并返回其值 | 位 5:0 FB；位 27:26 码表类型（0 宏块地址增量，1 宏块类型，2 运动矢量，3 双基运动矢量） | IPU_CMD.DATA：低 16 位为值，高 16 位为码长 |
| 4 | FDEC | 从码流取 32 位定长数据 | 位 5:0 FB | IPU_CMD.DATA |
| 5 | SETIQ | 从输入 FIFO 装入 64 字节量化矩阵 | 位 5:0 FB；位 27 选择矩阵（0 帧内 IQ，1 非帧内 NIQ） | 无 |
| 6 | SETVQ | 从输入 FIFO 装入 VQ 色表（16 个 16 位颜色，共 32 字节） | — | 无 |
| 7 | CSC | 把输入 FIFO 中的 YCbCr 宏块（每个 24 个四字）转换为 RGB | 位 10:0 MBC（宏块数），位 26 DTE，位 27 OFM | RGB32 或 RGB16 |
| 8 | PACK | 把 RGB32 宏块转换为 RGB16 或 INDX4 | 位 10:0 MBC，位 26 DTE，位 27 OFM | RGB16（OFM = 1）或 INDX4（OFM = 0） |
| 9 | SETTH | 设置 CSC 的透明度阈值 | 位 8:0 TH0，位 24:16 TH1 | 无，立即结束 |

参数说明：

- **FB**：执行命令前先在码流中跳过的位数（0–63），用于丢弃程序已经通过 IPU_TOP 看过的头部数据。
- **QSC**：量化步长码。按 IPU_CTRL.QST 选择线性或非线性映射。
- **DTD / DT**：DCT 类型（帧 DCT 或场 DCT）。IDEC 用 DTD 表示码流中是否带有 DCT 类型标志，BDEC 用 DT 直接给出 DCT 类型。
- **SGN**：为 1 时，把输出 RGB 各分量的最高位取反，即在无符号和有符号表示之间转换。
- **DTE**：RGB16 输出时是否抖动。
- **OFM**：输出格式。
- **DCR**：为 1 时，先复位 DC 预测值再解码本宏块。
- **MBI**：为 1 表示帧内宏块；为 0 表示非帧内宏块，只含残差。
- **TH0 / TH1**：CSC 生成 RGB32 时，R、G、B 都小于 TH0 的像素整个置 0（完全透明的黑色）；R、G、B 都小于 TH1 的像素，Alpha 置为 `0x40`（半透明）。

每个宏块的输出数据量：RGB32 为 64 个四字，RGB16 为 32 个四字，INDX4 为 8 个四字，BDEC 输出的 16 位 YCbCr 为 48 个四字（依据 PCSX2 pcsx2/IPU/IPU_MultiISA.h:26–50 中的宏块结构）。

### 10.2.1 命令的执行与结束

- 写入 IPU_CMD 时，IPU 先清除 IPU_CTRL.ECD 与 SCD（PCSX2 pcsx2/IPU/IPU.cpp:466–467）。
- BCLR 和 SETTH 不需要输入数据，立即结束。其余命令置 IPU_CTRL.BUSY，在输入 FIFO 有足够数据、输出 FIFO 有空间时逐步执行。
- VDEC、FDEC 的结果放在 IPU_CMD.DATA 中返回，结果有效之前 IPU_CMD 的位 63（BUSY）为 1。IPU_TOP 同样用位 63 表示预读数据是否有效。
- 命令结束时 IPU_CTRL.BUSY 清零，并向 INTC 位 8（IPU，见第 4 章）发出中断请求（PCSX2 pcsx2/IPU/IPU_MultiISA.cpp:2003–2005，IPUWorker）。
- IDEC、BDEC 在解码过程中遇到起始码时置 IPU_CTRL.SCD 并停止，遇到非法码字时置 ECD。程序据此判断一个片或一幅图像已经结束。

## 10.3 寄存器汇总

所有寄存器的状态都是 <Status s="unimplemented" />：内容依据 PCSX2，QEMU 不响应这些地址。

<RegSummary block="ipu" />

## 10.4 寄存器说明

### IPU_CMD
<Reg block="ipu" name="IPU_CMD" />

### IPU_CTRL
<Reg block="ipu" name="IPU_CTRL" />

### IPU_BP
<Reg block="ipu" name="IPU_BP" />

### IPU_TOP
<Reg block="ipu" name="IPU_TOP" />

### IPU_out_FIFO
<Reg block="ipu" name="IPU_out_FIFO" />

### IPU_in_FIFO
<Reg block="ipu" name="IPU_in_FIFO" />

## 10.5 编程要点

### 10.5.1 典型的 FMV 解码流程

下面是 MPEG-2 视频播放程序的一般步骤，只列出与 IPU 有关的部分。音频解码、码流分离和显示同步由程序另行完成。

1. **复位**：写 IPU_CTRL = `0x40000000`（RST = 1），再写 IPU_CMD = `0x00000000`（BCLR，BP = 0）。
2. **启动输入**：用 toIPU（通道 4）把视频码流从主存送入输入 FIFO。常用源链模式把分散的码流块串起来。
3. **解析头部**：循环读 IPU_TOP，等到位 63 为 0 后，查看码流中接下来的 32 位。用 FDEC 读出序列头、图像头等定长字段，用 FB 跳过已经处理过的位。
4. **装入矩阵**：码流带有自定义量化矩阵时，用 SETIQ 装入 IQ 与 NIQ 矩阵（各 64 字节，从当前码流位置开始）。
5. **设置图像参数**：按图像头和图像编码扩展，写 IPU_CTRL 的 PCT、IDP、AS、IVF、QST、MP1。
6. **解码宏块**：
   - I 图像：每个片写一条 IDEC 命令，同时用 fromIPU（通道 3）以普通模式接收 RGB32/RGB16 宏块。IPU 遇到下一个起始码时停止，并置 SCD。
   - P、B 图像：每个宏块先用 VDEC 依次取出宏块地址增量、宏块类型和运动矢量，再用 BDEC 解码残差。程序按运动矢量从参考帧取出预测块，与 BDEC 的输出相加，需要时再用 CSC 转为 RGB。
7. **等待结束**：轮询 IPU_CTRL.BUSY；或者在 INTC 中打开位 8，在中断处理程序中检查 SCD、ECD，然后发出下一条命令。
8. **显示**：把 RGB 宏块按位置拼成整帧，经 GIF（第 8 章）上传到 GS 的帧缓冲区或纹理区。

::: warning
fromIPU 通道必须在 IPU 开始输出之前（或同时）启动。否则输出 FIFO 很快就会满，IPU 停顿，命令无法结束。PCSX2 的 BDEC 实现在通道 3 未启动时也会一直等待（PCSX2 pcsx2/IPU/IPU_MultiISA.cpp:1291）。
:::

### 10.5.2 图像解压缩

只含 I 图像的压缩图像，可以按 10.5.1 节第 1–6 步用 IDEC 一次解码，得到 RGB32 或 RGB16 宏块，常配合 SETTH 生成带透明度的贴图。需要 4 位索引贴图时，先用 SETVQ 装入色表，再用 PACK（OFM = 0）把 RGB32 宏块转为 INDX4。

## 10.6 QEMU 模型说明

QEMU 不模拟 IPU：

| 项目 | 现状 |
|---|---|
| `0x10002000`–`0x10002FFF` | `hw/mips/ps2_ee.c` 中注册为未实现设备 `ps2.ipu`。读出为 0，写入被忽略，访问时记录 LOG_UNIMP |
| `0x10007000`–`0x10007FFF` | 未实现设备 `ps2.ipu-fifo`，行为同上 |
| DMAC 通道 3/4 | 寄存器可以读写，但没有接外设：toIPU 读取主存后丢弃数据，fromIPU 永不结束（见 6.9 节） |
| INTC 位 8（IPU） | 未接入，不会被置 1（见 4.7 节） |

因此在本模型中：

- **使用 IPU 的游戏无法播放 FMV。** 程序等待 IPU_CTRL.BUSY 时，读出值恒为 0，可能误以为命令已经结束；程序等待 fromIPU 通道或 IPU 中断时则会一直挂起。实际表现取决于游戏自己的播放程序。
- 用 IPU 解压贴图或背景图的游戏会得到错误的图像数据。
- BIOS 启动和 Linux 不使用 IPU，不受影响。

## 来源

- QEMU `hw/mips/ps2_ee.c`（未实现设备 `ps2.ipu`、`ps2.ipu-fifo`）
- PCSX2 pcsx2/Hw.h:19–20、:36–37、:47–50（地址窗口），pcsx2/Hw.h:108–111、:174–175（寄存器地址）
- PCSX2 pcsx2/IPU/IPU.h:20–66（IPU_CMD、IPU_CTRL 位域），:140–227（命令参数与命令码）
- PCSX2 pcsx2/IPU/IPU.cpp:216–388（寄存器读写、软件复位），:462（命令分派）
- PCSX2 pcsx2/IPU/IPU_MultiISA.cpp:1708–1870（FDEC、SETIQ、SETVQ、CSC、PACK），:1940（IPUWorker）
- PCSX2 pcsx2/IPU/IPU_Fifo.h、pcsx2/IPU/IPUdma.cpp（FIFO 与 DMA 通道 3/4）
