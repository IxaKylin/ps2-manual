# 第 16 章 运行 Linux

QEMU `-M ps2` 机型的 `-kernel` 选项可以直接给出 Linux 内核的 ELF 文件。此时板级代码把本项目编写的 ps2-lite-bios 放入 ROM0，由它启动 EE 与真实的 R3000A IOP，再跳到内核入口（[15.7.2 节](/chapters/15-boot#_15-7-2-ps2-lite-bios-与-linux-路径)）。本章按时间顺序跟踪一次完整的运行：从复位、IOP 重新引导与 IRX 加载，到挂载硬盘上的根文件系统并运行图形程序。

本章的日志与截图取自 2026-11-13 的一次运行，所用的回归脚本在建模过程中用于验证 Linux 路径；该次运行全部检查点通过。SIF 握手与 RPC 的寄存器细节见[第 11 章](/chapters/11-sif)，扩展接口与 ATA 见[第 14 章](/chapters/14-peripherals)。

## 16.1 运行环境

**表 16-1 软件组成**

| 组成 | 内容 |
|---|---|
| 内核 | frno7/linux（基于 Linux 5.4）的 PS2 移植，版本 5.4.221；小端 MIPS ELF |
| 内核命令行 | 编译时写入（`CONFIG_CMDLINE`）：`console=tty0 console=ttyS0`；QEMU 的 `-append` 不起作用 |
| initramfs | 编译进内核，含 BusyBox、IOP 驱动模块与 `/lib/firmware/ps2/*.irx`（printk、irq、irqrelay、dev9、ata、gamepad 共 6 个） |
| 根文件系统 | 256 MiB 硬盘镜像中的 ext4，接在 DEV9 的 ATA 上；含 Descent（D1X-Rebirth）与 ps2gl-cubes |
| ROM0 | QEMU 自带的 `ps2-lite-bios.bin`（23536 字节） |

运行命令（显示输出用 QMP 的 `screendump` 截取）：

```
qemu-system-mips64el -M ps2 -kernel vmlinux \
  -drive file=ps2hd.img,format=raw,if=ide,snapshot=on \
  -display none -serial stdio
```

串口（EE SIO，[14.6 节](/chapters/14-peripherals#_14-6-ee-调试串口-sio)）是内核与 shell 的控制台；GS 显示帧缓冲控制台与图形程序的画面。

## 16.2 启动流程

![图 16-1 QEMU 中 Linux 的启动流程](/img/fig16-1-linux-boot.svg)

**表 16-2 启动阶段**

| 阶段 | 执行方 | 内容 | 可信度 |
|---|---|---|---|
| ①～③ ps2-lite-bios | EE、IOP | 复位后按 PRId 分流；IOP 初始化内核并完成第一次 `sif_boot`；EE 等到 BOOTEND 后跳到内核入口 | <Status s="verified" /> |
| ④ 内核早期初始化 | EE | 解析 ROM0 的 ROMDIR 与 ROMVER，确定机型，注册串口与 GS 帧缓冲控制台，运行 `/init` | <Status s="verified" /> |
| ⑤ IOP 重新引导 | EE → IOP | `sif_init` 发 RESET_CMD，IOP 第二次 `sif_boot`；INIT_CMD 建立命令层与 RPC 层 | <Status s="verified" /> |
| ⑥ IRX 加载 | EE → IOP | 驱动请求的 IRX 经 LOADFILE 送到 IOP，由 ps2-lite-bios 的链接器重定位后运行 | <Status s="verified" /> |
| ⑦ 硬盘与根文件系统 | EE | pata_ps2 识别 `/dev/sda`，`switch_root` 到硬盘 | <Status s="verified" /> |
| ⑧ 应用程序 | EE、VU1、GS | 硬盘上的 `rcS` 加载 USB 等驱动；运行 Descent 与 ps2gl-cubes | <Status s="verified" /> |

可信度一栏的依据是本章的运行日志与 QEMU 建模记录（第 18～21、25 轮）中的 Linux 回归结果。

## 16.3 内核早期初始化

EE 跳到内核入口后，内核先从 ROM0 读取 ROMDIR 与 ROMVER。ps2-lite-bios 的 ROMVER 为 `0230EC20040614`（2.30 版，欧洲，2004-06-14）。版本号不低于 1.10 时，内核用 S 命令向 MechaCon 读取机型名称；QEMU 在 `-kernel` 为 ELF 时把 CDVD 的机型名设为 `SCPH-50004`，因此内核报告该机型。随后注册 EE SIO 串口控制台、GS 帧缓冲（PAL 隔行 576 × 460）与实时时钟。

**串口输出节选（内核早期）**

```
CPU0 revision is: 00002e20 (R5900)
Kernel command line:   console=tty0 console=ttyS0
Memory: 25620K/32768K available (3577K kernel code, ...)
ps2_uart: UART console registered as port ttyS0
rom0: Found 6 files in 23536 bytes
rom0: Version 0230 Europe CEX 2004-06-14
MIPS: machine is SCPH-50004
fb0: Graphics Synthesizer console frame buffer device
fb0: Mode option is "576x460i@50"
rtc-ps2 rtc-ps2: registered as rtc0
ps2gs: device ready, buffers up to 1024 KiB
Run /init as init process
```

“6 files”是 ps2-lite-bios 的 ROMDIR 项：RESET、ROMDIR、EXTINFO、ROMVER、IOPKERN、ADDDRV（[表 15-8](/chapters/15-boot#_15-7-2-ps2-lite-bios-与-linux-路径)）。`/proc/cpuinfo` 中的 `system type` 为“Sony PlayStation 2”，`cpu model` 为“R5900 V2.0”，`ASEs implemented` 为 `toshiba-mmi`。

## 16.4 IOP 重新引导与 IRX 加载

`/init` 是 initramfs 中的脚本，依次 `modprobe` 以下内核模块：sif、iop-heap、iop-memory、iop-module、iop-irq、iop-registers，然后是 iop-dev9、pata_ps2、sd_mod。

1. **sif**：`sif_init` 写 MAINADDR，发 RESET_CMD 让 IOP 重新引导。ps2-lite-bios 停止 SIF1、清空 SIF0 后回到 `iop_start`，再次完成握手；EE 写最终的 MAINADDR，发 INIT_CMD 0/1，IOP 以 WRITE_SREG 应答后 RPC 层就绪。寄存器层面的过程见 [11.7.1 节](/chapters/11-sif#_11-7-1-引导握手)。
2. **iop-module**：绑定 LOADFILE RPC 服务器。它会尝试修补 ROM0 中的 MODLOAD 模块，ps2-lite-bios 没有该模块，因此输出“sif: Failed to patch IOP with -2”，这不影响后续加载。
3. **IRX 请求**：各驱动调用 `iop_module_request`，从 `/lib/firmware/ps2/` 读取 IRX 文件，连同其依赖经 LOADFILE 的 `mod_buf_load` 送到 IOP。ps2-lite-bios 的链接器检查 ELF 头、做重定位、把导入项链接到内置库或已加载模块的导出库，然后运行模块入口。

**表 16-3 Linux 在 IOP 上加载的模块**

| IRX | 请求方（内核模块） | 作用 | IOP 模块号 |
|---|---|---|---|
| （IOP_lite_kernel） | — | ps2-lite-bios 的 IOP 内核，提供 6 个内置库 | 1 |
| printk | iop-module | 把 IOP 的打印经 SIF 命令送入内核日志（以“iop:”开头） | 3 |
| dev9 | iop-dev9 | 扩展接口的电源与识别 | 4 |
| ata | pata_ps2 | ATA 的辅助服务 | 5 |
| irq | （irqrelay 的依赖） | IOP 中断的分发库 | 6 |
| irqrelay | iop-irq | 把 IOP 一侧的中断转发给 EE | 7 |
| gamepad | gamepad（`modprobe gamepad`） | 手柄，按需加载 | — |

模块号取自 QEMU 建模记录中读取 `/sys/firmware/iop` 的结果（第 20、21 轮）<Status s="verified" />；“作用”一栏按 Linux 驱动源码概括 <Status s="reference" />。

**串口输出节选（IOP 一侧）**

```
PS2 QEMU initramfs up
sif: Failed to patch IOP with -2
dev9: Expansion device interface
dev9: Expansion device power on
iop: dev9: power is already on
iop: dev9: spdrev 11
iop: dev9: rev 30
iop: ata_sif_cmd_bb: bounce buffer size 1024 bytes
iop: irqrelay: IRQ relay ready
```

以“iop:”开头的行由 IOP 上的 IRX 输出，经 printk 模块与 SIF 命令转到 EE。这说明这些模块确实在 R3000A 上运行，而不是由 QEMU 代为应答（SIF 中没有高层模拟，[11.8 节](/chapters/11-sif#_11-8-qemu-模型说明)）。

## 16.5 根文件系统与应用程序

pata_ps2 以 PIO 方式访问扩展接口上的 ATA 寄存器，识别出 QEMU 的 IDE 硬盘。`/init` 挂载其中的 ext4，找到 `/sbin/init` 后执行 `switch_root`。

```
pata_ps2_probe cmd b4000040 ctl b400005c status b400004e irq 110
ata1: PATA max PIO4 irq 110
ata1.00: ATA-7: QEMU HARDDISK, 2.5+, max UDMA/100
sd 0:0:0:0: [sda] 524288 512-byte logical blocks: (268 MB/256 MiB)
EXT4-fs (sda): mounted filesystem with ordered data mode. Opts: (null)
init: switching to the root file system on /dev/sda
```

硬盘上的 `/etc/init.d/rcS` 加载 USB（OHCI）与 HID 驱动，建立 24 MiB 的 zram 压缩交换区（主存只有 32 MiB），然后在后台运行 `/data/autorun.sh` 启动 Descent。串口与 GS 上各有一个 shell。

```
ohci-ps2 ohci-ps2: PlayStation 2 USB OHCI host controller
ohci-ps2 ohci-ps2: irq 86, io mem 0x1f801600
Adding 24572k swap on /dev/zram0.  Priority:100 extents:1 across:24572k SS
autorun: descent
```

Descent 与 ps2gl-cubes 都通过 `/dev/ps2gs` 使用 ps2gl（PS2 上的 OpenGL 实现），由 VU1 做几何变换，经 GIF 交给 GS 绘制（[第 7～9 章](/chapters/07-vpu)）。

![图 16-2 ps2gl-cubes（320 × 240）](/img/fig16-2-linux-cubes.png)

ps2gl-cubes 每帧绘制 27 个立方体（324 个三角形），共 600 帧。本次运行的输出为“600 frames in 12032 ms: 49 frames each second”；帧率取决于主机性能，只作参考。

![图 16-3 Descent（D1X-Rebirth，640 × 480）的选择驾驶员界面](/img/fig16-3-linux-descent.png)

**表 16-4 本次运行各检查点的用时**

| 检查点 | 串口中的标记 | 距上一检查点 |
|---|---|---|
| initramfs 启动 | `PS2 QEMU initramfs up` | 1.6 s（自 QEMU 启动） |
| 切换到硬盘根文件系统 | `switching to the root file system on /dev/sda` | 2.9 s |
| Descent 启动 | `autorun: descent` | 2.0 s |
| Descent 运行中 | autorun 的第 4 次资源报告 | 18.2 s |
| ps2gl-cubes 完成 | `600 frames in … ms` | 20.2 s（含退出 Descent） |

用时在默认的多线程 TCG（MTTCG）下测得，EE 与 IOP 各占一个主机线程。

## 16.6 QEMU 模型说明

与 Linux 路径有关的限制：

| 项目 | 说明 |
|---|---|
| 内核参数与 initrd | `-append` 不起作用（命令行编译进内核）；`-initrd` 只输出警告并忽略 |
| MODLOAD | ps2-lite-bios 没有 MODLOAD，Linux 的修补步骤失败但无害 |
| IOP 空闲线程 | 忙等；在 `thread=single` 下占用 EE 的执行时间，回归脚本需要延后结束 Descent 才能通过 |
| ATA | 只用 PIO；IOP DMA 通道 8 立即结束并输出 LOG_UNIMP |
| 输入设备 | SIO2 上没有手柄，USB 上没有设备；本章的程序在没有输入的情况下运行 |
| 声音 | 未验证 |
| 帧缓冲控制台 | 本章编写时对没有硬盘的启动做过一次 `screendump`，GS 上的控制台文字只显示了一小部分；尚未分析原因，图形程序的画面正常 |

其余已知问题见[附录 D](/appendix/known-gaps)。

## 16.7 来源

- 本章的运行日志与截图：2026-11-13 用 QEMU 建模时的 Linux 回归脚本运行，全部检查点通过
- QEMU 建模记录：ps2-lite-bios 与 Linux 启动（第 18～21 轮）、`/sys/firmware/iop` 模块列表（第 20、21 轮）、`thread=single` 运行（第 21、25 轮）
- QEMU `hw/mips/ps2.c`（`ps2_load_rom0`、`ps2_load_lite_bios`）、`pc-bios/ps2-lite-bios/`（`ee.S`、`iop_entry.S`、`iop_kernel.c`、`sif.c`、`services.c`、`irx.c`）
- frno7/linux：`arch/mips/ps2/identify.c`（按 ROMVER 选择读取机型的方法）、`drivers/ps2/sif.c`（`sif_init` 的 13 个步骤）、`drivers/ps2/iop-module-request.c`（`iop_module_request`、MODLOAD 修补、`ps2/<名>.irx` 固件路径）、`drivers/ps2/iop-module-sysfs.c`（`/sys/firmware/iop`）、`drivers/ps2/iop-dev9.c`、`drivers/ps2/iop-irq.c`、`drivers/ata/pata_ps2.c`、`drivers/ps2/gamepad.c`（各自请求的 IRX）
- 本项目的 initramfs `/init` 脚本与硬盘镜像中的 `/etc/init.d/rcS`、`/usr/bin/descent`
