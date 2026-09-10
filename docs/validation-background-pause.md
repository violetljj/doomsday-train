# 切出暂停定点验证

2026-09-10，在当前 Web 构建的 Cocos 浏览器运行时验证。

通过 `cc.game.emit(cc.Game.EVENT_HIDE)` 调用实际注册的切出处理器。分别从 combat、supply、workshop 状态连续发送两次事件，再调用 Game.update(1/30) 共1800次，最后调用 Combat.resume()。

| 起始状态 | 重复切出后 | 60秒模拟更新 | 恢复后 |
| --- | --- | --- | --- |
| combat | paused，previous 保持 combat | 时间和装甲不变 | combat |
| supply | paused，previous 保持 supply | 时间和装甲不变 | supply |
| workshop | paused，previous 保持 workshop | 时间和装甲不变 | workshop |

首次检查脚本错误调用不存在的 model.snapshot，未进入断言；移除该未使用调用后，以上三条路径全部通过。

这是受控引擎事件检查，不是真实切换应用后的60秒等待，也不是抖音真机验证。尚未证明设备后台音频、系统回收后的恢复或跨刷新续局。未修改游戏暂停逻辑。
