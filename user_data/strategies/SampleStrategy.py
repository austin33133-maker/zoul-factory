# pragma pylint: disable=missing-docstring, invalid-name
"""
SampleStrategy —— 入门示例策略（EMA 交叉 + RSI 过滤）

⚠️ 重要：这是用来「学怎么跑」的示例，不是能稳定赚钱的策略。
   任何策略上真钱前，务必先 backtesting 回测 + dry-run 模拟盘验证。
   默认参数会亏钱是正常的，重点是跑通流程。

freqtrade 策略接口文档：https://www.freqtrade.io/en/stable/strategy-customization/
"""

from pandas import DataFrame
import talib.abstract as ta
from freqtrade.strategy import IStrategy


class SampleStrategy(IStrategy):
    # 策略接口版本（当前稳定版用 3）
    INTERFACE_VERSION = 3

    # 只做多（现货）
    can_short = False

    # 时间周期，要和 config.json 的 timeframe 一致
    timeframe = "5m"

    # ---- 止盈（分段止盈）：key 是持仓分钟数，value 是目标收益率 ----
    # 例：持有 0 分钟起要 +4%；30 分钟后 +2% 就走；60 分钟后 +1%；120 分钟后保本出
    minimal_roi = {
        "0": 0.04,
        "30": 0.02,
        "60": 0.01,
        "120": 0
    }

    # ---- 止损：-5% 硬止损，防止单笔巨亏（务必保留）----
    stoploss = -0.05

    # ---- 移动止损：盈利到 +1% 后，回撤 0.5% 就落袋 ----
    trailing_stop = True
    trailing_stop_positive = 0.005
    trailing_stop_positive_offset = 0.01
    trailing_only_offset_is_reached = True

    # 每根 K 线收盘后才处理信号（更稳，不追 tick）
    process_only_new_candles = True
    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False

    # 启动所需的历史 K 线数量（指标够算就行）
    startup_candle_count: int = 50

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """计算技术指标。"""
        dataframe["ema_fast"] = ta.EMA(dataframe, timeperiod=9)
        dataframe["ema_slow"] = ta.EMA(dataframe, timeperiod=21)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """入场（买入）条件：快线上穿慢线，且 RSI 未超买。"""
        dataframe.loc[
            (
                (dataframe["ema_fast"] > dataframe["ema_slow"])
                & (dataframe["ema_fast"].shift(1) <= dataframe["ema_slow"].shift(1))
                & (dataframe["rsi"] < 70)
                & (dataframe["volume"] > 0)  # 有成交量，过滤脏数据
            ),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """出场（卖出）信号：快线下穿慢线，或 RSI 超买。
        （止盈/止损由上面的 minimal_roi / stoploss 自动处理，这里是信号出场）"""
        dataframe.loc[
            (
                (
                    (dataframe["ema_fast"] < dataframe["ema_slow"])
                    & (dataframe["ema_fast"].shift(1) >= dataframe["ema_slow"].shift(1))
                )
                | (dataframe["rsi"] > 80)
            )
            & (dataframe["volume"] > 0),
            "exit_long",
        ] = 1
        return dataframe
