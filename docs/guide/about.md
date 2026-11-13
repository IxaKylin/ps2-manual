# 关于本手册

## 性质

本手册是 PlayStation 2（以下简称 PS2）主机芯片组的**非官方**技术参考，按嵌入式处理器 datasheet 的体例编写，内容包括芯片架构、总线互连、存储器映射、寄存器地址、位域定义与典型操作步骤。

::: warning 声明
- Sony 从未公开发布 PS2 芯片的 datasheet。官方的 *EE Core User's Manual*、*EE User's Manual*、*GS User's Manual*、*VU User's Manual* 等文档仅在保密协议（NDA）下提供给授权开发商。**本手册未使用任何 NDA 文档的内容。**
- 本手册内容是根据公开资料、开源模拟器源码以及 QEMU 建模过程中的实测结果逆向整理而成，**可能存在错误或遗漏**，不能替代官方文档。
- PlayStation、PS2、Emotion Engine、Graphics Synthesizer 为 Sony Interactive Entertainment Inc. 的商标或注册商标。本手册与 Sony 无任何关联，也未获其认可。
:::

## 资料来源

| 来源 | 性质 | 使用方式 |
|---|---|---|
| QEMU `-M ps2` 机型 | 本项目实现的系统模拟，含 qtest 测试，可运行真实 BIOS 进入 OSDSYS 菜单 | 寄存器行为的主要依据；“已验证”等级的来源 |
| [PCSX2](https://github.com/PCSX2/pcsx2) | 开源 PS2 模拟器，GPLv3 | 只引用事实（地址、位定义），注明文件与行号，不复制代码 |
| [DobieStation](https://github.com/PSI-Rockin/DobieStation) | 开源 PS2 模拟器，GPLv3 | 同上，用于交叉核对 |
| [ps2tek](https://psi-rockin.github.io/ps2tek/) | 社区整理的 PS2 硬件文档，未声明授权 | 仅转述并附链接，不照搬原文 |
| [ps2sdk](https://github.com/ps2dev/ps2sdk) | 开源 PS2 开发包 | 寄存器名称与软件使用方式 |
| frno7/linux（Fredrik Noring 的 PS2 Linux 移植，基于 Linux 5.4，<https://github.com/frno7/linux>） | 开源内核移植，GPLv2 | 寄存器名称与驱动用法 |
| [Copetti：PlayStation 2 架构](https://www.copetti.org/zh-hans/writings/consoles/playstation-2/) | 架构科普文章 | 仅参照章节结构，本手册插图全部重新绘制 |

各寄存器的具体出处列在其“来源”栏中，全部参考资料见[附录 C](/appendix/references)。

## 可信度等级

每个寄存器块、寄存器乃至位域都带有可信度标记：

| 标记 | 含义 |
|---|---|
| <Status s="verified" /> | QEMU 已实现该功能，并有 qtest 用例，或经真实 BIOS、Linux 运行验证 |
| <Status s="reference" /> | 依据 PCSX2、ps2tek 等公开资料，未经本项目测试验证；也包括 QEMU 已实现但没有测试覆盖的功能（此时在说明中注明） |
| <Status s="unimplemented" /> | QEMU 未模拟，内容来自公开资料，仅给出地址与概述 |

覆盖范围分为两级：

- QEMU 已实现的部件给出完整的寄存器与位域说明；
- 未实现的部件（如 IPU、i.LINK）只给出地址范围、功能概述与主要寄存器列表。

已知的不确定项和本项目与其他资料的差异汇总在[附录 D](/appendix/known-gaps)。

## 适用硬件

除特别说明外，本手册描述的是 SCPH-3xxxx 至 SCPH-5xxxx 系列（“厚机”）的行为；“已验证”等级所用的真实 BIOS 为 SCPH-39001。早期型号的 i.LINK 接口、后期薄机的整合芯片以及 PS1 兼容模式的细节不在本手册范围内，仅在相关章节简要提及。
